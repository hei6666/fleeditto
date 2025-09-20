module fleeditto::test_mode{

    use std::string::{String, utf8};
    friend fleeditto::fleeditto;

    struct TestPlan has key,store{
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

    public(friend) fun create_test_plan (
        pool: String,   //hyperion or thala
        range_top: u32,
        range_down: u32,
        current_price: u32,
        total_lp: u64,
        tick: u8,
        ratio: u64,
        fee: u64,
        time: u64
    ):TestPlan {
        TestPlan{
            pool,
            range_top,
            range_down,
            current_price,
            total_lp,
            tick,
            ratio,
            fee,
            time
        }
    }


}