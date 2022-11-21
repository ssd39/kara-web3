import { useEffect, useState } from 'react';
import styles from '../styles/Home.module.css'
import Head from 'next/head'
import { useRouter } from 'next/router'
import {Grid, Button, Loader, Modal, Header } from 'semantic-ui-react'
import Image from 'next/image'

export default function Dashboard(){
    let wallet;
    if (typeof window !== "undefined") {
      wallet = window.wallet
    }
    const [isLoading, setLoading] = useState(true)
    const [myTokens, setMyTokens] = useState(0)
    const [showSucess, setShowSucess] = useState(false)
    const [accountId, setAccountId] = useState("")
    const [products, setProducts] = useState([])
    const router = useRouter()
    useEffect(()=>{
        (async ()=>{
            let isSignedIn = await wallet.startUp();
            if (!isSignedIn) {
              router.push("/");
            }else{
                setAccountId(wallet.accountId)
                let tokenAmnt = await wallet.viewMethod({
                    contractId:"kara.karaforheri.testnet", 
                    method:"ft_balance_of",
                    args:{
                        account_id: wallet.accountId
                    }
                })
                setMyTokens(tokenAmnt)
                let result = await wallet.viewMethod({
                    contractId:"karaforheri.testnet", 
                    method:"get_offers"
                })
                //console.log(result)
                let data_from_chain = {}
                for(let x of result){
                    data_from_chain[x.id] = x
                }
                let res = await (await fetch('https://kara-web3.onrender.com/partners')).json()
                let p = []
                for(let x in res['offers']){
                    let y = res['offers'][x]
                    y['paroduct_id'] = x
                    y['partner_id'] = data_from_chain[x].companyid
                    y['partner_name'] = res['componies'][data_from_chain[x].companyid].name
                    y['amount'] = data_from_chain[x].price
                    p.push(y)
                }
                setProducts(p)

                if(!router.asPath.includes("errorMessage") && router.asPath.includes("transactionHashes")){
                    router.replace('/dashboard', undefined, { shallow: true });
                    setShowSucess(true)
                }else if(router.asPath.includes("errorMessage")){
                    router.replace('/dashboard', undefined, { shallow: true });
                }
                setLoading(false);
            }
        })()
    },[])
    return(
        <div className={styles.container}>
        <Head>
          <title>Kara Web3</title>
          <meta name="description" content="Kara Web3 Reward Dashboard" />
          <link rel="icon" href="/logo.png" />
        </Head>
        <main className={styles.main} style={{justifyContent:'flex-start'}}>
            <Loader style={{position:'absolute', top:0,bottom:0,left:0,right:0, margin:'auto'}} active={isLoading} inline='centered'  />
            {!isLoading && (
                <div style={{width:'100%'}}>
                    <div style={{width:'100%', margin:20}}>
                        <div style={{display:'flex', flexDirection:'row', width:'100%', justifyContent:'space-around'}}>
                            <div style={{display:'flex', flexDirection:'row',  alignItems:'center'}}>
                                <h2 style={{margin:0, padding:0}}>Hi, </h2>
                                <h2 style={{margin:0, padding:0, marginLeft:10, color:'#6f2da8', fontWeight:'bolder'}}>{accountId}</h2>
                            </div>
                            <div style={{display:'flex', flexDirection:'row', alignItems:'center'}}>
                                <h2 style={{margin:0, padding:0}}>K-Tokens: </h2>
                                <h2 style={{margin:0, padding:0, marginLeft:10, color:'green',fontWeight:'bolder'}}>{myTokens}</h2>
                                <Button onClick={()=>{
                                    setLoading(true); 
                                    wallet.signOut()
                                }} style={{marginLeft:20}} inverted color='violet'>
                                    Logout
                                </Button>
                            </div>
                        </div>
                        <div style={{width:'100%',display:'flex', alignItems:'center', justifyContent:'center', marginTop:25, marginBottom:10}}>
                            <div className={styles.divider_line} style={{width:'80%', height:5, borderRadius:40}}></div>
                        </div>
                    </div>
                    <div>
                    <Grid container columns={4}>
                    {products.map((product, i) => (
                            <Grid.Column key={i}>
                            <div style={{width:'85%', height:300, padding:10, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'space-around'}} className={styles.card_bg}>
                                <Image alt="offer-logo" src={product.url} width={128} height={128} />
                                <div style={{margin: 10, display:'flex',flexDirection:'column', alignItems:'center'}}>
                                    <h1 style={{fontSize: 20, margin:0, color:"#bb4ecf", textAlign:'center'}}>{product.name}</h1>
                                    <h1 style={{fontSize: 14, margin:0, color:"#b00000"}}>By {product.partner_name}</h1>
                                    <h1 style={{fontSize: 15, margin:5}}>{product.amount} K-Tokens</h1>
                                </div>
                                <Button onClick={async ()=>{
                                    setLoading(true)
                                    wallet.callMethod({
                                        contractId:"karaforheri.testnet", 
                                        method:"lock_asset", 
                                        args:{
                                            offerid: parseInt(product.paroduct_id)
                                        }
                                    })
                                }}  inverted color='green'>
                                    Reedeme
                                </Button>
                            </div>
                        </Grid.Column>
                    ))}

                    </Grid>
                    </div>
                    <div className={styles.footer_x} style={{width:'100%',display:'flex', alignItems:'center', justifyContent:'center'}}>
                        <div className={styles.divider_line} style={{width:'80%', height:5, borderRadius:40}}></div>
                    </div>
                    <Modal
                        onClose={() => setShowSucess(false)}
                        onOpen={() => setShowSucess(true)}
                        open={showSucess}
                        >
                        <Modal.Header>Congratulations 🎉</Modal.Header>
                        <Modal.Content image>
                            <Modal.Description>
                            <p>
                              You redeemed your favourite offer sucessfully!
                            </p>
                            </Modal.Description>
                        </Modal.Content>
                        <Modal.Actions>
                            <Button color='black' onClick={() => setShowSucess(false)}>
                                Ok 👍
                            </Button>
                        </Modal.Actions>
                        </Modal>
                </div>
            )}
        </main>
        </div>
    )
}