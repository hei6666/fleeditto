module thalaswap_v2::coin_wrapper {

    use aptos_framework::fungible_asset::Metadata;
    use aptos_framework::object::Object;
    struct Notacoin {}

    // create_pool_weighted<T0,T1,T2,T3>(&signer, vector<0x1::object::Object<0x1::fungible_asset::Metadata>>, vector<u64>, vector<u64>, u64)
    public entry fun create_pool_weighted<T0, T1, T2, T3>(
        lp_signer: &signer,
        meta: vector<Object<Metadata>>,
        amount: vector<u64>,
        percentage: vector<u64>,
        feee: u64
    ) {}
}
