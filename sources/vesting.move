module fleeditto::vesting {

    use std::error;
    use std::fixed_point32;
    use std::fixed_point32::FixedPoint32;
    use std::vector;
    use aptos_framework::timestamp;

    friend fleeditto::fleeditto;

    struct VestingSchedule has copy, drop, store {
        // The vesting schedule as a list of fractions that vest for each period. The last number is repeated until the
        // vesting amount runs out.
        // For example [1/24, 1/24, 1/48] with a period of 1 month means that after vesting starts, the first two months
        // will vest 1/24 of the original total amount. From the third month only, 1/48 will vest until the vesting fund
        // runs out.
        // u32/u32 should be sufficient to support vesting schedule fractions.
        schedule: vector<FixedPoint32>,
        // When the vesting should start.
        start_timestamp_secs: u64,
        // In seconds. How long each vesting period is. For example 1 month.
        period_duration: u64
        // Last vesting period, 1-indexed. For example if 2 months have passed, the last vesting period, if distribution
        // was requested, would be 2. Default value is 0 which means there have been no vesting periods yet.
    }

    /// Vesting schedule cannot be empty.
    const E_EMPTY_VESTING_SCHEDULE: u64 = 2;
    /// Vesting period cannot be 0.
    const E_ZERO_VESTING_SCHEDULE_PERIOD: u64 = 3;
    /// Vesting cannot start before or at the current block timestamp. Has to be in the future.
    const E_VESTING_START_TOO_SOON: u64 = 6;

    public(friend) fun create(
        start_time: u64,
        vesting_numerators: vector<u64>,
        vesting_denominator: u64,
        vesting_period: u64
    ): VestingSchedule {
        let schedule = vector::empty<FixedPoint32>();
        vector::for_each_ref(
            &vesting_numerators,
            |num| {
                vector::push_back(
                    &mut schedule,
                    fixed_point32::create_from_rational(*num, vesting_denominator)
                );
            }
        );
        create_vesting_schedule(schedule, start_time, vesting_period)
    }

    /// Create a vesting schedule with the given schedule of distributions, a vesting start time and period duration.
    fun create_vesting_schedule(
        schedule: vector<FixedPoint32>,
        start_timestamp_secs: u64,
        period_duration: u64
    ): VestingSchedule {
        assert!(
            vector::length(&schedule) > 0,
            error::invalid_argument(E_EMPTY_VESTING_SCHEDULE)
        );
        assert!(
            period_duration > 0,
            error::invalid_argument(E_ZERO_VESTING_SCHEDULE_PERIOD)
        );
        assert!(
            start_timestamp_secs >= timestamp::now_seconds(),
            error::invalid_argument(E_VESTING_START_TOO_SOON)
        );

        VestingSchedule { schedule, start_timestamp_secs, period_duration
        }
    }
}
