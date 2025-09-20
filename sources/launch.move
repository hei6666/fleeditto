module fleeditto::launch{
    use aptos_framework::fungible_asset::{
        Self,
        Metadata,
    
        FungibleAsset,
        amount,
        metadata_from_asset,
        
    };
    use aptos_framework::object::{Object};
    use std::signer::address_of;
    use std::string::{String, utf8};
    use aptos_framework::timestamp::now_seconds;
    use aptos_framework::primary_fungible_store;
    use std::option::{Self};
    use hyperion::router_v3;
    use thalaswap_v2::coin_wrapper::{Self,Notacoin} ;
    struct Tick has store,drop,copy {
            tick : u8,
            range_down : u32,
            range_top : u32,
            current_price :u32,
            main_fa_total_amount:u64,
            coin_total_amount:u64
    }
    /// not same 
    const LENGTH_NOT_SAME:u64 = 12;
    /// pool not right
    const NOT_RIGHT_POOL:u64 =13;

    friend fleeditto::fleeditto;
    
    public(friend) fun launch(
        ditto_signer:&signer,
        pool:String,
        tick : u8,
        range_down : u32,
        range_top : u32,
        current_price :u32,
        main_fa_total_amount:u64,
        coin_total_amount:u64,

        main_fa:FungibleAsset,
        main_pair_fa:FungibleAsset,
        support_main_fa:option::Option<vector<FungibleAsset>>,
        support_pair_fa:option::Option<vector<FungibleAsset>>,
    ){
        let tick = create_tick(
            tick ,
            range_down ,
            range_top ,
            current_price ,
            main_fa_total_amount,
            coin_total_amount
        );
        if(pool == utf8(b"thala")){
            launch_on_thala(ditto_signer,&tick,main_fa,main_pair_fa,support_main_fa,support_pair_fa)
        }else if(pool == utf8(b"hyperion")){
            launch_on_hyperion(ditto_signer,&tick,main_fa,main_pair_fa,support_main_fa,support_pair_fa)
        }else if(pool == utf8(b"both")){
            fungible_asset::destroy_zero(main_fa);
            fungible_asset::destroy_zero(main_pair_fa);
            support_main_fa.destroy_none();
            support_pair_fa.destroy_none();
        }else{
            
            abort NOT_RIGHT_POOL
        };
        
    }



    /// @dev (EN) The core logic for launching liquidity pools on Hyperion DEX.
    /// @dev Workflow:
    /// 1. Collect the staked liquidity assets from all projects.
    /// 2. Call `launch_main_hyperion` to create the main pool (e.g., DITTO/APT).
    /// 3. Call `launch_support_hyperion` to create a support pool for each participating project (e.g., PROJECT/DITTO).
    /// @dev (中文) 在 Hyperion DEX 上啟動流動性池的核心邏輯。
    /// @dev 流程:
    /// 1. 收集所有項目質押的流動性資產。
    /// 2. 調用 `launch_main_hyperion` 創建主池 (例如 DITTO/APT)。
    /// 3. 調用 `launch_support_hyperion` 為每個參與項目創建支持池 (例如 PROJECT/DITTO)。
    public(friend) fun launch_on_hyperion(
        ditto_signer: &signer, 
        tick:&Tick,
        main_fa:FungibleAsset,
        main_pair_fa:FungibleAsset,
        support_main_fa:option::Option<vector<FungibleAsset>>,
        support_pair_fa:option::Option<vector<FungibleAsset>>,
    ) { 
        
        // let main_fa = zero(plan.liquidity_meta);
        // for (i in 0..plan.project.length()) {
        //     let project = &plan.project[i];
        //     let fa =
        //         dispatchable_fungible_asset::withdraw(
        //             ditto_signer, *project.lp_store.borrow(), project.init_lp_amount
        //         );
        //     fungible_asset::merge(&mut main_fa, fa);
        // };
        launch_main_hyperion(ditto_signer,tick, main_fa,main_pair_fa);
        if(support_main_fa.is_some() && support_pair_fa.is_some()){
            launch_support_hyperion(ditto_signer,tick,support_main_fa.destroy_some(),support_pair_fa.destroy_some());
        }else{
            support_main_fa.destroy_none();
            support_pair_fa.destroy_none();
        };  
    }

    fun launch_main_hyperion(
        ditto_signer: &signer, plan: &Tick, main_fa: FungibleAsset,main_pair_fa:FungibleAsset
    ) {
        let total_main_coin_amount = amount(&main_fa);
        let total_pair_lp_amount = amount(&main_pair_fa);
        let meta_main =metadata_from_asset(&main_fa);
        let meta_pair = metadata_from_asset(&main_pair_fa);
        primary_fungible_store::deposit(address_of(ditto_signer),main_fa);
        primary_fungible_store::deposit(address_of(ditto_signer),main_pair_fa);
        router_v3::create_liquidity(
            ditto_signer,
            meta_main,
            meta_pair,
            plan.tick,
            plan.range_down,
            plan.range_top,
            plan.current_price,
            total_pair_lp_amount,
            total_main_coin_amount,
            1,
            1,
            now_seconds()
        );
    }

    fun launch_support_hyperion(ditto_signer: &signer, plan:  &Tick,ditto_fa :vector<FungibleAsset>,project_fa:vector<FungibleAsset>) {
        assert!(ditto_fa.length() == project_fa.length(),LENGTH_NOT_SAME);
        while (!ditto_fa.is_empty()){
            let ditto = ditto_fa.pop_back();
            let project = project_fa.pop_back();
            let ditto_amount = fungible_asset::amount(&ditto);
            let project_amount = fungible_asset::amount(&project);
            let meta_main =metadata_from_asset(&ditto);
            let meta_pair = metadata_from_asset(&project);
            primary_fungible_store::deposit(address_of(ditto_signer),ditto);
            primary_fungible_store::deposit(address_of(ditto_signer),project);
            router_v3::create_liquidity(
                ditto_signer,
                meta_main,
                meta_pair,
                plan.tick,
                plan.range_down,
                plan.range_top,
                plan.current_price,
                ditto_amount,
                project_amount,
                1,
                1,
                now_seconds()
            );
        };
        ditto_fa.destroy_empty();
        project_fa.destroy_empty();
    }

    fun create_tick(
            tick : u8,
            range_down : u32,
            range_top : u32,
            current_price :u32,
            main_fa_total_amount:u64,
            coin_total_amount:u64
    ):Tick{
        Tick{
            tick ,
            range_down ,
            range_top ,
            current_price ,
            main_fa_total_amount,
            coin_total_amount
        }
    }

    /// @dev (EN) The core logic for launching liquidity pools on Thala DEX.
    /// @dev Note: The logic for creating support pools on Thala (`launch_support_thala`) is not yet fully implemented.
    /// @dev (中文) 在 Thala DEX 上啟動流動性池的核心邏輯。
    /// @dev 注意：目前 Thala 的支持池創建邏輯 (`launch_support_thala`) 尚未完全實現。
    public(friend) fun launch_on_thala(
        ditto_signer: &signer,
        tick:&Tick,
        main_fa:FungibleAsset,
        main_pair_fa:FungibleAsset,
        support_main_fa:option::Option<vector<FungibleAsset>>,
        support_pair_fa:option::Option<vector<FungibleAsset>>,
    ) {

        launch_main_thala(ditto_signer, tick, main_fa,main_pair_fa);
        launch_support_thala(support_main_fa,support_pair_fa)
    }

    fun launch_main_thala(
        ditto_signer: &signer, tick:&Tick, main_fa: FungibleAsset,main_pair_fa:FungibleAsset
    ) {
        
        let fa_amount = amount(&main_fa);
        let main_coin_amount = tick.coin_total_amount;
        let major_meta = metadata_from_asset(&main_fa);
        let main_coin_meta = metadata_from_asset(&main_pair_fa);
        primary_fungible_store::deposit(address_of(ditto_signer), main_fa);
        // let main_coin_fa = main_pair_fa;
        primary_fungible_store::deposit(address_of(ditto_signer), main_pair_fa);
        
        
        let meta = vector<Object<Metadata>>[main_coin_meta, major_meta];
        let amount = vector<u64>[main_coin_amount, fa_amount];
        let p = vector<u64>[50, 50];
        coin_wrapper::create_pool_weighted<Notacoin, Notacoin, Notacoin, Notacoin>(
            ditto_signer, meta, amount, p, (tick.tick as u64)
        );
    }

    /// @dev (EN) TODO: Create a support pool (PROJECT/DITTO) for each participating project on Thala.
    /// @dev This is a feature to be extended and implemented in the future.
    /// @dev (中文) TODO: 在 Thala 上為每個參與項目創建支持池 (PROJECT/DITTO)。
    /// @dev 這是協議未來需要擴展和實現的功能。
    fun launch_support_thala(
        support_main_fa:option::Option<vector<FungibleAsset>>,
        support_pair_fa:option::Option<vector<FungibleAsset>>,
    ) {
         support_main_fa.destroy_none();
         support_pair_fa.destroy_none();
    }
}