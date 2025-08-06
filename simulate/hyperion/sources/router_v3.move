module hyperion::router_v3 {
    use aptos_framework::fungible_asset::Metadata;
    use aptos_framework::object::Object;

    public entry fun create_liquidity(
        lp: &signer,
        token_a: Object<Metadata>,
        token_b: Object<Metadata>,
        fee_tier: u8,
        tick_lower: u32,
        tick_upper: u32,
        tick_current: u32,
        amount_a_desired: u64,
        amount_b_desired: u64,
        amount_a_min: u64,
        amount_b_min: u64,
        deadline: u64
    ) {
    }
}
