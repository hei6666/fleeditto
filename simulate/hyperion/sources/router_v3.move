module hyperion::router_v3 {
    use aptos_framework::fungible_asset::Metadata;
    use aptos_framework::object::Object;
    use hyperion::position_v3::Info;

    public entry fun create_liquidity(
        _lp: &signer,
        _token_a: Object<Metadata>,
        _token_b: Object<Metadata>,
        _fee_tier: u8,
        _tick_lower: u32,
        _tick_upper: u32,
        _tick_current: u32,
        _amount_a_desired: u64,
        _amount_b_desired: u64,
        _amount_a_min: u64,
        _amount_b_min: u64,
        _deadline: u64
    ) {
        abort(0);
    } 

    public entry fun claim_fees_and_rewards(
        _lp: &signer, _lp_objects: vector<address>, _to: address
    ) {
         abort(0);
    }
    
    
    public fun remove_liquidity_directly_deposit(
        _lp: &signer,
        _lp_object: Object<Info>,
        _liquidity_delta: u128,
        _amount_a_min: u64,
        _amount_b_min: u64,
        _deadline: u64
    ){
          abort(0);
    }
}
