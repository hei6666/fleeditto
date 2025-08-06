module fleeditto::factory {
    use std::option::{some, none};
    use std::string::String;
    use aptos_framework::event;
    use aptos_framework::fungible_asset;
    use aptos_framework::fungible_asset::{
        Metadata,
        BurnRef,
        TransferRef,
        MintRef,
        generate_burn_ref,
        generate_mint_ref,
        FungibleAsset
    };
    use aptos_framework::object::{
        Object,
        ExtendRef,
        ConstructorRef,
        object_from_constructor_ref,
        generate_extend_ref,
        generate_transfer_ref
    };
    use aptos_framework::primary_fungible_store;

    friend fleeditto::fleeditto;

    struct Control has store {
        metadata: Object<Metadata>,
        extend_ref: ExtendRef,
        burn_ref: BurnRef,
        tran_ref: TransferRef,
        mint_ref: MintRef
    }
    #[event]
    struct Burnevent has copy,drop,store{
        burner:address,
        meta:Object<Metadata>,
        amount:u64
    }

    public fun create_main_coin(
        conf: &ConstructorRef,
        name: String,
        url: String,
        project_url: String,
        symbol: String,
        max_supply: u128
    ): Control {
        let supply =
            if (max_supply == 0) {
                none<u128>()
            } else {
                some(max_supply)
            };
        primary_fungible_store::create_primary_store_enabled_fungible_asset(
            conf, supply, name, symbol, 8, url, project_url
        );
        Control {
            metadata: object_from_constructor_ref<Metadata>(conf),
            extend_ref: generate_extend_ref(conf),
            burn_ref: generate_burn_ref(conf),
            tran_ref: fungible_asset::generate_transfer_ref(conf),
            mint_ref: generate_mint_ref(conf)
        }
    }

    public(friend) fun mint_coin(control: &Control, amount: u64): FungibleAsset {
        fungible_asset::mint(&control.mint_ref, amount)
    }

    public(friend) fun get_meta(control: &Control): Object<Metadata> {
        control.metadata
    }

    public(friend) fun burn(burner:address,control: &Control,fa:FungibleAsset) {
        event::emit(Burnevent{
            burner,
            meta:fungible_asset::metadata_from_asset(&fa),
            amount:fungible_asset::amount(&fa),
        });
        fungible_asset::burn(&control.burn_ref,fa)
    }
}
