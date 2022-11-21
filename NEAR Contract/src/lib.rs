use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::log;
use near_sdk::near_bindgen;

use near_sdk::collections::LookupMap;
use near_sdk::serde::{Deserialize, Serialize};

use near_sdk::collections::Vector;
use near_sdk::json_types::U128;
use near_sdk::{
    assert_one_yocto, env, ext_contract, AccountId, Balance, Gas, IntoStorageKey, PanicOnDefault,
    Promise, PromiseOrValue, PromiseResult, StorageUsage,
};

use near_sdk;

const MIN_ATTACHED_BALANCE: Balance = 30_000_000_000_000_000_000_000_000;
const ONE_YOCTO: u128 = 1_000_000_000_000_000_000_000_000;
const NO_DEPOSIT: Balance = 0;
pub mod gas {
    use near_sdk::Gas;

    /// The base amount of gas for a regular execution.
    const BASE: Gas = 5_000_000_000_000;

    /// The amount of Gas the contract will attach to the promise to create the staking pool.
    /// The base for the execution and the base for staking action to verify the staking key.
    pub const STAKING_POOL_NEW: Gas = BASE;

    /// The amount of Gas the contract will attach to the callback to itself.
    /// The base for the execution and the base for whitelist call or cash rollback.
    pub const CALLBACK: Gas = BASE;

    /// The amount of Gas the contract will attach to the promise to the whitelist contract.
    /// The base for the execution.
    pub const WHITELIST_STAKING_POOL: Gas = BASE;
}

#[derive(Serialize)]
#[serde(crate = "near_sdk::serde")]

pub struct Assetargs {
    /// Owner account ID of the staking pool.
    owner_id: AccountId,
    /// The Total Supply
    total_supply: U128,
    /// The price of 1 asset
    price: u128,
}

#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]

pub struct Userdata {
    pub userid: AccountId,
    pub total: LookupMap<u128, u128>,
    pub locked: LookupMap<u128, u128>,
    pub map: LookupMap<u128, String>,
    pub aureus: u128,
}

#[derive(Serialize)]
#[serde(crate = "near_sdk::serde")]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]

pub struct Company {
    pub id: u128,
    pub name: String,
}


#[derive(Serialize)]
#[serde(crate = "near_sdk::serde")]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]


pub struct Offer {
    pub id: u128,
    pub companyid: u128,
    pub price: u128,
}

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]

pub struct State {
    pub owner: AccountId,
    pub companylist: LookupMap<u128, Company>,
    pub offerlist: LookupMap<u128, Offer>,
    pub totalcompany: u128,
    pub totaloffer: u128,
}

#[ext_contract(ext_self)]
pub trait ExtSelf {
    fn on_asset_create(
        &mut self,
        asset_account_id: AccountId,
        price: u128,
        name: String,
        assetid: u128,
    );
    fn on_mint(&mut self, accid: AccountId);
    fn on_aureus(&mut self, accid: AccountId, amount: u128);
    fn on_lock(&mut self);
}

#[ext_contract(ext_token)]
trait Token {
    fn mint(account: AccountId, amount: u128) -> bool;
    fn setlock(account: AccountId, amount: u128, lock: bool) -> bool;
}
#[near_bindgen]
impl State {
    #[init]
    #[payable]
    pub fn default() -> Self {
        let mut this = Self {
            owner: env::predecessor_account_id(),
            offerlist: LookupMap::new(b"s".to_vec()),
            companylist: LookupMap::new(b"m".to_vec()),
            totalcompany: 0,
            totaloffer: 0,
        };
        let price = 20;
        let owner_id = env::current_account_id();
        let total_supply: U128 = U128(5000);
        Promise::new(this.get_kara().clone())
            .create_account()
            .transfer(env::attached_deposit())
            .deploy_contract(include_bytes!("./fungible_token.wasm").to_vec())
            .function_call(
                b"new_default_meta".to_vec(),
                near_sdk::serde_json::to_vec(&Assetargs {
                    owner_id,
                    total_supply,
                    price,
                })
                .unwrap(),
                NO_DEPOSIT,
                gas::STAKING_POOL_NEW,
            );

        this
    }
    pub fn assert_self() {
        assert_eq!(env::predecessor_account_id(), env::current_account_id());
    }

    pub fn get_kara(&self) -> AccountId {
        return "kara".to_string() + "." + &env::current_account_id();
    }

    pub fn mint(&mut self, amount: u128) {
        assert_eq!(self.owner,env::predecessor_account_id());
        self.mint_asset(amount);
    }

    pub fn addcompany(&mut self, name: String) {
        let  comp = &Company {
            id: self.totalcompany,
            name: name,
        };
        self.companylist.insert(&self.totalcompany, comp);
        self.totalcompany = self.totalcompany + 1;
    }

    pub fn addoffer(&mut self, companyid: u128,price:u128) {
        let  comp = &Offer {
            id: self.totaloffer,
            companyid: companyid,
            price: price,
        };
        self.offerlist.insert(&self.totaloffer, comp);
        self.totaloffer = self.totaloffer + 1;
    }
    pub fn mint_asset(&mut self, amount: u128) {
        ext_token::mint(
            env::predecessor_account_id(),
            amount,
            &self.get_kara(),
            NO_DEPOSIT,
            gas::CALLBACK,
        )
        .then(ext_self::on_mint(
            env::predecessor_account_id(),
        
            &env::current_account_id(),
            NO_DEPOSIT,
            gas::CALLBACK,
        ));
    }
    pub fn lock_asset(&mut self, offerid:u128) {
        ext_token::setlock(
            env::predecessor_account_id(),
            self.offerlist.get(&offerid).unwrap().price,
            true,
            &self.get_kara(),
            NO_DEPOSIT,
            gas::CALLBACK,
        )
        .then(ext_self::on_lock(
            &env::current_account_id(),
            NO_DEPOSIT,
            gas::CALLBACK,
        ));
    }

    pub fn on_lock(&mut self) {
        if (self.is_promise_success()) {
            near_sdk::log!("success");
        }
    }

    pub fn on_mint(&mut self, accid: AccountId) {
        if (self.is_promise_success()) {
            near_sdk::log!("success");
        }
    }
    pub fn is_promise_success(&self) -> bool {
        assert_eq!(
            env::promise_results_count(),
            1,
            "Contract expected a result on the callback"
        );
        match env::promise_result(0) {
            PromiseResult::Successful(_) => true,
            _ => false,
        }
    }
    pub fn get_offers(&self) -> Vec<Offer> {
        
        let mut abc:Vec<Offer> = vec![];
        for i in 0..self.totaloffer{
            abc.push(self.offerlist.get(&i).unwrap());
        }
        abc
    }
    pub fn get_company(&self) -> Vec<Company> {
        
        let mut abc:Vec<Company> = vec![];
        for i in 0..self.totalcompany{
            abc.push(self.companylist.get(&i).unwrap());
        }
        abc
    }
}
