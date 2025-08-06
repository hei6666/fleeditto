module fleeditto::project_interface{
    use aptos_framework::object::{
        Object,
        create_object,
        generate_signer,
        object_from_constructor_ref,
        object_address
    };
    use aptos_framework::fungible_asset::{
        Metadata,
        FungibleStore,
        create_store,
        FungibleAsset,
        amount,
        metadata_from_asset,
        zero
    };
    use aptos_framework::primary_fungible_store;
    use fleeditto::fleeditto;

    public fun burn_coin(burner:&signer,main:Object<Metadata>,coin_meta:Object<Metadata>,amount:u64){
        let burn_fa = primary_fungible_store::withdraw(burner,coin_meta,amount);
        fleeditto::burn_coin(burner,main,burn_fa);
    }
}