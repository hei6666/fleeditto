module hyperion::position_v3{
    use aptos_framework::object::Object;
    struct Info has key{}
    public fun get_liquidity(_position: Object<Info>): u128  {
        1
    }
}