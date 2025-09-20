module fleeditto::batch{
    use aptos_std::object::{Object,address_to_object};
    use aptos_std::fungible_asset::{Metadata};
    use hyperion::router_v3;
    use hyperion::position_v3::{Self,Info};
    use aptos_framework::timestamp;
    use aptos_framework::signer;
    
   
    public entry fun batch_hyperion(
        owner:&signer,
        token_a:vector<Object<Metadata>>,
        token_b:vector<Object<Metadata>>,
        fee_tier:vector<u8>,
        tick_lower:vector<u32>,
        tick_upper:vector<u32>,
        tick_current:vector<u32>,
        amount_a_desired:vector<u64>,
        amount_b_desired:vector<u64>
        ){
           for(i in 0..token_a.length()){
                router_v3::create_liquidity(
                    owner,
                    token_a[i],
                    token_b[i],
                    fee_tier[i],
                    tick_lower[i],
                    tick_upper[i],
                    tick_current[i],
                    amount_a_desired[i],
                    amount_b_desired[i],
                    0,0,timestamp::now_seconds()
                )
           }
    }
    public entry fun batch_claim_hyperion(owner:&signer,batch:vector<address>){
        router_v3::claim_fees_and_rewards(owner,batch,signer::address_of(owner))
    }
    public entry fun remove_all_hyperion(owner:&signer,batch:vector<address>){
        batch.for_each(|position|{
            remove_hyperion(owner,position)
        });
    }
    public entry fun remove_hyperion(owner:&signer,position:address){
            let lp = position_v3::get_liquidity(address_to_object<Info>(position));
            router_v3::remove_liquidity_directly_deposit(owner,address_to_object<Info>(position),lp,0,0,timestamp::now_seconds())
    }

    // public entry fun batch_tapp(){}
    // public entry fun batch_thala(){}
}