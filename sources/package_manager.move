module fleeditto::package_manager {

    use aptos_framework::object::{
        ExtendRef,
        create_named_object,
        generate_signer,
        generate_extend_ref,
        create_object_address,
        generate_signer_for_extending
    };
    friend fleeditto::fleeditto;
    struct SignerControl has key {
        ext: ExtendRef
    }

    const Ditto: vector<u8> = b"ditto";
    public(friend) fun get_signer(): signer acquires SignerControl {
        generate_signer_for_extending(
            &borrow_global<SignerControl>(get_ditto_address()).ext
        )
    }

    public(friend) fun get_ditto_address(): address {
        create_object_address(&@fleeditto, Ditto)
    }

    fun init_module(ditto: &signer) {
        let object = &create_named_object(ditto, Ditto);
        move_to(
            &generate_signer(object),
            SignerControl { ext: generate_extend_ref(object) }
        );
    }
}
