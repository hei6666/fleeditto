/// @title Fleeditto Protocol
/// @author Fleeditto Team
///
/// @notice (EN) This is the core smart contract for the Fleeditto Protocol.
/// Fleeditto is a Capital-Efficient Fair Launchpad built on Aptos.
/// Its core idea is to create a shared liquidity engine, allowing multiple new projects to launch and bootstrap liquidity with extremely high capital efficiency.
///
/// Main Workflow:
/// 1. The protocol admin (`ditto_admin`) creates a launch plan via `create_plan`.
/// 2. Project teams (`project_admin`) join the plan via `for_project` and stake their initial liquidity assets (e.g., APT).
/// 3. Once all projects are ready, the admin calls `ready_to_the_pool`, and the protocol automatically creates liquidity pools on a decentralized exchange (DEX) in the Aptos ecosystem.
///
/// Currently, the protocol primarily integrates with Hyperion's v3 concentrated liquidity model to achieve maximum capital efficiency.
/// The protocol is designed for easy expansion to support more DEXs on Aptos in the future.
///
/// @notice (中文) 這是 Fleeditto 協議的核心智能合約。
/// Fleeditto 是一個建立在 Aptos 上的資本高效公平啟動平台 (Capital-Efficient Fair Launchpad)。
/// 它的核心思想是創建一個共享流動性引擎，允許多個新項目以極高的資本效率共同啟動和引導流動性。
///
/// 主要流程：
/// 1. 協議管理員 (`ditto_admin`) 通過 `create_plan` 創建一個啟動計畫。
/// 2. 各個項目方 (`project_admin`) 通過 `for_project` 加入該計畫，並質押初始流動性資產 (如 APT)。
/// 3. 當所有項目準備就緒後，管理員調用 `ready_to_the_pool`，協議將會自動在 Aptos 生態的去中心化交易所 (DEX) 上創建流動性池。
///
/// 目前，協議主要集成 Hyperion 的 v3 集中流動性模型，以實現最高的資本效率。
/// 未來，協議設計上可以輕鬆擴展，以兼容更多 Aptos 上的 DEX。
module fleeditto::fleeditto {

    use std::option::{Option, none, some};
    use std::signer::address_of;
    use std::string::{String, utf8};
    use aptos_std::smart_table;
    use aptos_std::smart_table::SmartTable;

    use aptos_std::smart_vector::{SmartVector, new};
    use aptos_framework::dispatchable_fungible_asset;
    use aptos_framework::fungible_asset;
    use aptos_framework::fungible_asset::{
        Metadata,
        FungibleStore,
        create_store,
        FungibleAsset,
        amount,
        metadata_from_asset,
        zero
    };
    use aptos_framework::object::{
        Object,
        create_object,
        generate_signer,
        object_from_constructor_ref,
        object_address
    };
    use aptos_framework::primary_fungible_store;
    use aptos_framework::timestamp::now_seconds;
    use hyperion::router_v3;
    use thalaswap_v2::coin_wrapper;
    use thalaswap_v2::coin_wrapper::Notacoin;
    use fleeditto::package_manager::{get_signer, get_ditto_address};
    use fleeditto::factory::{Control, create_main_coin, mint_coin, get_meta,burn};
    use fleeditto::vesting::{VestingSchedule, create};

    friend fleeditto::project_interface;

    const NOT_ADMIN: u64 = 9001;
    const NOT_SUPPORT_POOL: u64 = 9002;
    const NOT_CORRECT_TICK: u64 = 9003;
    const NO_PLAN: u64 = 9004;
    const NOT_PROJECT_ADMIN: u64 = 9005;
    const AMOUNT_NOT_CORRECT: u64 = 9006;
    const LENGTH_NOT_SAME: u64 = 9007;
    const NOT_READY: u64 = 9008;
    const NOTHING: u64 = 9009;
    const NOT_RIGHT_TIME: u64 = 9010;
    const PROJECT_NUMBER_NOT_MATCH:u64 =9011;
    const Ditto_url: vector<u8> = b"";
    const Ditto_name: vector<u8> = b"";
    const Ditto_symbol: vector<u8> = b"";
    const Ditto_project_url: vector<u8> = b"";
    const TICK: u8 = 5;
    const MAGIC_NUMBER: u32 = 443636;

    /// @dev (EN) The core state storage of the protocol.
    /// `admin`: A list of admin addresses that can create launch plans.
    /// `list`: A SmartTable mapping each main token (e.g., DITTO) to its corresponding launch plan (`Plan`).
    /// @dev (中文) 協議的核心狀態存儲。
    /// `admin`: 能夠創建啟動計畫的管理員地址列表。
    /// `list`: 一個智能表 (SmartTable)，映射每個主代幣 (如 DITTO) 到其對應的啟動計畫 (`Plan`)。
    struct Ditto has key, store {
        admin: SmartVector<address>,
        list: SmartTable<Object<Metadata>, Object<Plan>>
    }

    /// @dev (EN) Defines a complete launch plan.
    /// `vesting_schedule`: The token vesting schedule for the plan.
    /// `project`: A list of details for all projects participating in this plan.
    /// `main_token`: The controller for the core token (e.g., DITTO), used for minting and burning.
    /// `liquidity_meta`: Metadata of the base asset used for providing liquidity (e.g., APT).
    /// `pool`: The name of the DEX where the liquidity pool will be deployed (e.g., "hyperion" or "thala").
    /// `range_top`, `range_down`, `current_price`: Price range parameters for concentrated liquidity pools (like Hyperion v3).
    /// `total_lp`: The total amount of liquidity staked by all projects.
    /// `tick`: The tick spacing for the liquidity pool.
    /// `time`: The earliest timestamp when the plan can be launched.
    /// @dev (中文) 定義了一個完整的啟動計畫。
    /// `vesting_schedule`: 該計畫中代幣的釋放時間表。
    /// `project`: 參與此計畫的所有項目的詳細資訊列表。
    /// `main_token`: 核心代幣 (如 DITTO) 的控制器，用於鑄造和銷毀。
    /// `liquidity_meta`: 用於提供流動性的基礎資產的元數據 (例如 APT)。
    /// `pool`: 將要部署流動性池的 DEX 名稱 (例如 "hyperion" 或 "thala")。
    /// `range_top`, `range_down`, `current_price`: 針對集中流動性池 (如 Hyperion v3) 的價格範圍參數。
    /// `total_lp`: 所有項目質押的流動性總額。
    /// `tick`: 流動性池的 tick spacing。
    /// `time`: 計畫啟動的最早時間戳。
    struct Plan has store {
        vesting_schedule: VestingSchedule,
        project: vector<Project>,
        main_token: Control,
        main_token_amount: u64,
        liquidity_meta: Object<Metadata>,
        pool: String,   //hyperion or thala
        range_top: u32,
        range_down: u32,
        current_price: u32,
        total_lp: u64,
        tick: u8,
        ratio: u64,
        fee: u64,
        time: u64
    }

    struct Project has store {
        ready: bool,
        dex_name: String,
        project_admin: address,
        init_lp_amount: u64,
        vesting_address: vector<address>,
        vesting_amount: vector<u64>,
        total_vesting_amount: u64,
        lp_store: Option<Object<FungibleStore>>,
        project_coin: Option<Control>,
        tick: u8,
        range_top: u32,
        range_down: u32,
        current_price: u32
    }

    /// @notice (EN) [Admin Only] Creates a new launch plan.
    /// @param ditto_admin The signer of the admin.
    /// @param project_number The expected number of projects to participate in this plan.
    /// @param project_admin A list of admin addresses for each participating project.
    /// @param lp_meta The metadata object of the base asset (e.g., APT) for providing liquidity.
    /// @param pool The name of the target DEX, currently "hyperion" is primarily supported.
    /// @param time The earliest time (Unix timestamp) the plan can be launched.
    /// @param ... Other parameters for configuring the main token, liquidity pool, and vesting schedule.
    /// @notice (中文) [僅限管理員] 創建一個新的啟動計畫。
    /// @param ditto_admin 管理員的簽名者。
    /// @param project_number 預計參與此計畫的項目數量。
    /// @param project_admin 每個參與項目的管理員地址列表。
    /// @param lp_meta 用於提供流動性的基礎資產 (如 APT) 的元數據對象。
    /// @param pool 目標 DEX 的名稱，目前主要支持 "hyperion"。
    /// @param time 計畫可以啟動的最早時間 (Unix 時間戳)。
    /// @param ... 其他參數用於配置主代幣、流動性池和代幣釋放計畫。
    public entry fun create_plan(
        ditto_admin: &signer,
        project_number: u64,
        project_admin: vector<address>,
        project_init_li_amount: vector<u64>,
        lp_meta: Object<Metadata>,
        pool: String,
        ratio: u64,
        fee: u64,
        time: u64,
        total_lp: u64,
        main_token_amount: u64,
        main_coin_name: Option<String>,
        main_coin_symbol: Option<String>,
        main_coin_url: Option<String>,
        main_coin_project_url: Option<String>,
        tick_top: Option<u32>,
        tick_down: Option<u32>,
        current_price: Option<u32>,
        tick: u8,
        vesting_numerators: vector<u64>,
        vesting_denominator: u64,
        start_time: u64,
        vesting_period: u64,
        total_vesting_amount: vector<u64>
    ) acquires Ditto {
        let ditto = borrow_global_mut<Ditto>(get_ditto_address());
        assert!(ditto.admin.contains(&address_of(ditto_admin)), NOT_ADMIN);
        let new_plan_conf = &create_object(get_ditto_address());
        let plan_signer = &generate_signer(new_plan_conf);
        assert!(
            pool == utf8(b"thala") || pool == utf8(b"hyperion"),
            NOT_SUPPORT_POOL
        );
        assert!(tick <= TICK, NOT_CORRECT_TICK);
        assert!(project_number == project_admin.length(),PROJECT_NUMBER_NOT_MATCH);
        let new_control =
            if (ditto.list.length() == 0) {
                main_coin_name.destroy_none();
                main_coin_symbol.destroy_none();
                main_coin_url.destroy_none();
                main_coin_project_url.destroy_none();
                create_main_coin(
                    new_plan_conf,
                    utf8(Ditto_name),
                    utf8(Ditto_url),
                    utf8(Ditto_project_url),
                    utf8(Ditto_symbol),
                    0
                )
            } else {
                assert!(
                    main_coin_name.is_some()
                        && main_coin_url.is_some()
                        && main_coin_project_url.is_some()
                        && main_coin_symbol.is_some(),
                    NOTHING
                );
                create_main_coin(
                    new_plan_conf,
                    main_coin_name.destroy_some(),
                    main_coin_url.destroy_some(),
                    main_coin_project_url.destroy_some(),
                    main_coin_symbol.destroy_some(),
                    0
                )
            };
        let main_coin = object_from_constructor_ref<Metadata>(new_plan_conf);
        let (upper, lower, current) =
            if (tick_top.is_none() && tick_down.is_none()) {
                (MAGIC_NUMBER, MAGIC_NUMBER, 1)
            } else {
                (
                    tick_top.destroy_some(),
                    tick_down.destroy_some(),
                    current_price.destroy_some()
                )
            };
        let vesting =
            create(
                start_time,
                vesting_numerators,
                vesting_denominator,
                vesting_period
            );

        let project = vector<Project>[];
        for (i in 0..project_admin.length()) {
            project.push_back(
                create_project(
                    &project_admin[i], total_vesting_amount[i], project_init_li_amount[i]
                )
            )
        };

        let new_plan = Plan {
            vesting_schedule: vesting,
            project,
            main_token: new_control,
            liquidity_meta: lp_meta,
            pool,
            total_lp,
            main_token_amount,
            range_top: upper,
            range_down: lower,
            current_price: current,
            tick,
            ratio,
            fee,
            time
        };
        move_to(plan_signer, new_plan);
        let plan_object = object_from_constructor_ref<Plan>(new_plan_conf);
        ditto.list.add(main_coin, plan_object);
    }

    /// @notice (EN) [Project Team Only] Allows a project team to join an existing launch plan.
    /// @dev The project team needs to provide their project token details and stake their committed initial liquidity in this function.
    /// @param project_signer The signer of the project admin.
    /// @param main_meta The main token metadata of the plan, used to identify which plan to join.
    /// @param project_name The name of the project.
    /// @param coin_name, symbol, url... Metadata for the project's token.
    /// @param vesting_address, vesting_amount Recipient addresses and amounts for token vesting.
    /// @notice (中文) [僅限項目方] 項目方加入一個已創建的啟動計畫。
    /// @dev 項目方需要在此函數中提供其項目代幣的詳細資訊，並質押其承諾的初始流動性。
    /// @param project_signer 項目方管理員的簽名者。
    /// @param main_meta 計畫的主代幣元數據，用於標識要加入的計畫。
    /// @param project_name 項目名稱。
    /// @param coin_name, symbol, url... 項目代幣的元數據。
    /// @param vesting_address, vesting_amount 代幣釋放的接收地址和數量。
    public entry fun for_project(
        project_signer: &signer,
        main_meta: Object<Metadata>,
        project_name: String,
        coin_name: String,
        symbol: String,
        url: String,
        project_url: String,
        max_supply: u128,
        vesting_address: vector<address>,
        vesting_amount: vector<u64>
    ) acquires Ditto, Plan {
        let ditto = borrow_global<Ditto>(get_ditto_address());
        assert!(ditto.list.contains(main_meta), NO_PLAN);
        let plan_obj = ditto.list.borrow(main_meta);
        let plan = borrow_global_mut<Plan>(object_address(plan_obj));
        let (contain, index) =
            plan.project.find(|project| {
                project.project_admin == address_of(project_signer)
            });
        assert!(contain, NOT_PROJECT_ADMIN);
        let project = plan.project.borrow_mut(index);
        project.dex_name = project_name;
        check_amount(vesting_address, vesting_amount, project.total_vesting_amount);

        let new_store =
            create_store(&create_object(get_ditto_address()), plan.liquidity_meta);
        dispatchable_fungible_asset::deposit(
            new_store,
            primary_fungible_store::withdraw(
                project_signer, plan.liquidity_meta, project.init_lp_amount
            )
        );
        let new_conf = &create_object(get_ditto_address());
        let new_control =
            create_main_coin(
                new_conf,
                coin_name,
                url,
                project_url,
                symbol,
                max_supply
            );

        project.project_coin = some(new_control);
        project.lp_store = some(new_store);
        project.ready = true;
        project.vesting_address = vesting_address;
        project.vesting_amount = vesting_amount;
    }

    /// @notice (EN) [Admin Only] Triggers the launch to create all liquidity pools on the target DEX.
    /// @dev This function checks if all projects in the plan are ready (funds deposited) and if the scheduled launch time has been reached.
    /// @dev It calls the corresponding DEX launch function (e.g., `launch_on_hyperion`) based on the `pool` set in the plan.
    /// @param ditto_admin The signer of the admin.
    /// @param main_meta The main token metadata of the plan, used to identify which plan to launch.
    /// @notice (中文) [僅限管理員] 觸發啟動，在目標 DEX 上創建所有流動性池。
    /// @dev 此函數會檢查計畫中的所有項目是否都已準備就緒 (資金到位)，以及是否達到了預設的啟動時間。
    /// @dev 根據計畫中設定的 `pool`，它會調用對應的 DEX 啟動函數 (如 `launch_on_hyperion`)。
    /// @param ditto_admin 管理員的簽名者。
    /// @param main_meta 計畫的主代幣元數據，用於標識要啟動的計畫。
    public entry fun ready_to_the_pool(
        ditto_admin: &signer, main_meta: Object<Metadata>
    ) acquires Ditto, Plan {
        let ditto = borrow_global<Ditto>(get_ditto_address());
        assert!(ditto.list.contains(main_meta), NO_PLAN);
        let plan_obj = ditto.list.borrow(main_meta);
        let plan = borrow_global<Plan>(object_address(plan_obj));
        let is_ready = is_ready(plan);
        assert!(is_ready, NOT_READY);
        assert!(now_seconds() >= plan.time, NOT_RIGHT_TIME);
        if (plan.pool == utf8(b"hyperion")) {
            launch_on_hyperion(&get_signer(), plan);
        } else if (plan.pool == utf8(b"thala")) {
            launch_on_thala(&get_signer(), plan);
        }
    }

    /// @dev (EN) The core logic for launching liquidity pools on Hyperion DEX.
    /// @dev Workflow:
    /// 1. Collect the staked liquidity assets from all projects.
    /// 2. Call `launch_main_hyperion` to create the main pool (e.g., DITTO/APT).
    /// 3. Call `launch_suppoert_hyperion` to create a support pool for each participating project (e.g., PROJECT/DITTO).
    /// @dev (中文) 在 Hyperion DEX 上啟動流動性池的核心邏輯。
    /// @dev 流程:
    /// 1. 收集所有項目質押的流動性資產。
    /// 2. 調用 `launch_main_hyperion` 創建主池 (例如 DITTO/APT)。
    /// 3. 調用 `launch_suppoert_hyperion` 為每個參與項目創建支持池 (例如 PROJECT/DITTO)。
    fun launch_on_hyperion(ditto_signer: &signer, plan: &Plan) {
        let main_fa = zero(plan.liquidity_meta);
        for (i in 0..plan.project.length()) {
            let project = &plan.project[i];
            let fa =
                dispatchable_fungible_asset::withdraw(
                    ditto_signer, *project.lp_store.borrow(), project.init_lp_amount
                );
            fungible_asset::merge(&mut main_fa, fa);
        };
        launch_main_hyperion(ditto_signer, plan, main_fa);
        launch_suppoert_hyperion(ditto_signer, plan);
    }

    fun launch_main_hyperion(
        ditto_signer: &signer, plan: &Plan, main_fa: FungibleAsset
    ) {
        let toal_main_coin_amount = plan.main_token_amount;
        let total_pair_lp_amount = amount(&main_fa);
        let main_coin_fa = mint_coin(&plan.main_token, toal_main_coin_amount);
        router_v3::create_liquidity(
            ditto_signer,
            metadata_from_asset(&main_fa),
            metadata_from_asset(&main_coin_fa),
            plan.tick,
            plan.range_down,
            plan.range_top,
            plan.current_price,
            total_pair_lp_amount,
            toal_main_coin_amount,
            1,
            1,
            now_seconds()
        );
    }

    fun launch_suppoert_hyperion(ditto_signer: &signer, plan: &Plan) {
        for (i in 0..plan.project.length()) {
            let project = &plan.project[i];
            let amount = project.init_lp_amount;
            let ditto_fa = mint_coin(&plan.main_token, amount);
            let project_fa = mint_coin(project.project_coin.borrow(), amount);
            router_v3::create_liquidity(
                ditto_signer,
                metadata_from_asset(&ditto_fa),
                metadata_from_asset(&project_fa),
                project.tick,
                project.range_down,
                project.range_top,
                project.current_price,
                amount,
                amount,
                1,
                1,
                now_seconds()
            );
        };
    }

    /// @dev (EN) The core logic for launching liquidity pools on Thala DEX.
    /// @dev Note: The logic for creating support pools on Thala (`launch_suppoert_thala`) is not yet fully implemented.
    /// @dev (中文) 在 Thala DEX 上啟動流動性池的核心邏輯。
    /// @dev 注意：目前 Thala 的支持池創建邏輯 (`launch_suppoert_thala`) 尚未完全實現。
    fun launch_on_thala(ditto_signer: &signer, plan: &Plan) {
        let main_fa = zero(plan.liquidity_meta);
        for (i in 0..plan.project.length()) {
            let project = &plan.project[i];
            let fa =
                dispatchable_fungible_asset::withdraw(
                    ditto_signer, *project.lp_store.borrow(), project.init_lp_amount
                );
            fungible_asset::merge(&mut main_fa, fa);
        };
        launch_main_thala(ditto_signer, plan, main_fa);
    }

    fun launch_main_thala(
        ditto_signer: &signer, plan: &Plan, main_fa: FungibleAsset
    ) {
        let fa_amount = amount(&main_fa);
        let main_coin_amouint = plan.total_lp;
        primary_fungible_store::deposit(address_of(ditto_signer), main_fa);
        let main_coin_fa = mint_coin(&plan.main_token, fa_amount);
        primary_fungible_store::deposit(address_of(ditto_signer), main_coin_fa);
        let major_meta = plan.liquidity_meta;
        let main_coin_meta = get_meta(&plan.main_token);
        let meta = vector<Object<Metadata>>[main_coin_meta, major_meta];
        let amount = vector<u64>[main_coin_amouint, fa_amount];
        let p = vector<u64>[50, 50];
        coin_wrapper::create_pool_weighted<Notacoin, Notacoin, Notacoin, Notacoin>(
            ditto_signer, meta, amount, p, plan.fee
        );
    }

    /// @dev (EN) TODO: Create a support pool (PROJECT/DITTO) for each participating project on Thala.
    /// @dev This is a feature to be extended and implemented in the future.
    /// @dev (中文) TODO: 在 Thala 上為每個參與項目創建支持池 (PROJECT/DITTO)。
    /// @dev 這是協議未來需要擴展和實現的功能。
    fun launch_suppoert_thala() {}

    fun is_ready(plan: &Plan): bool {
        let ready = 0;
        let total_amount = 0;
        for (i in 0..plan.project.length()) {
            let project = &plan.project[i];
            let balance =
                if (project.lp_store.is_some()) {
                    fungible_asset::balance(*project.lp_store.borrow())
                } else { 0 };
            if (project.ready && balance == project.init_lp_amount) {
                total_amount += balance;
                ready += 1;
            }
        };
        let r =
            if (ready == plan.project.length() && total_amount == plan.total_lp) { true }
            else { false };
        r
    }

    fun check_amount(
        vector_admin: vector<address>, vesting_amount: vector<u64>, total: u64
    ) {
        assert!(vector_admin.length() == vesting_amount.length(), LENGTH_NOT_SAME);
        let amount = 0;
        for (i in 0..vesting_amount.length()) {
            amount += vesting_amount[i]
        };
        assert!(total == amount, AMOUNT_NOT_CORRECT);
    }

    fun create_project(
        project_address: &address, vesting_amount: u64, init_lp_amount: u64
    ): Project {
        Project {
            ready: false,
            dex_name: utf8(b"Pending"),
            project_admin: *project_address,
            init_lp_amount,
            vesting_address: vector[],
            vesting_amount: vector[],
            total_vesting_amount: vesting_amount,
            lp_store: none<Object<FungibleStore>>(),
            project_coin: none<Control>(),
            tick: 0,
            range_top: MAGIC_NUMBER,
            range_down: MAGIC_NUMBER,
            current_price: 0
        }
    }

    fun init_module(_ditto: &signer) {
        let new_v = new<address>();
        new_v.push_back(@fleeditto);
        move_to(
            &get_signer(),
            Ditto {
                admin: new_v,
                list: smart_table::new<Object<Metadata>, Object<Plan>>()
            }
        );
    }

    public(friend) fun burn_coin(burner:&signer,main:Object<Metadata>,fa:FungibleAsset){
        let coin = metadata_from_asset(&fa);
        let ditto = borrow_global<Ditto>(get_ditto_address());
        assert!(ditto.list.contains(main), NO_PLAN);
        let plan = borrow_global<Plan>(object_address(ditto.list.borrow(main)));
        burn(address_of(burner),&plan.main_token,fa);
    }
}
