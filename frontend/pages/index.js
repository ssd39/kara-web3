import 'regenerator-runtime/runtime';
import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import GradinetText from '../styles/GradientText.module.css'
import { useEffect, useState } from 'react';
import { Button, Loader } from 'semantic-ui-react'
import { useRouter } from 'next/router'

export default function Home() {
  let wallet;
  if (typeof window !== "undefined") {
    wallet = window.wallet
  }
  const [isLoading, setLoading] = useState(true)
  const router = useRouter()
  useEffect(()=>{
    (async ()=>{
      let isSignedIn = await wallet.startUp();
      if (!isSignedIn) {
        setLoading(false)
      }else{
        let queryParams = (router.asPath.replace("/?", "")).split("&")
        for(let q of queryParams){
          if(q.includes("redirect_url")){
            let redirect_path = q.split("=")[1]
            router.push(decodeURIComponent(redirect_path))
            return;
          }
        }
        router.push("/dashboard")
      }
    })()
  },[])
  const connectWallet = async () =>{
    setLoading(true);
    wallet.signIn(); 
  }
  return (
    <div className={styles.container}>
      <Head>
        <title>Kara Web3</title>
        <meta name="description" content="Kara Web3 Reward Dashboard" />
        <link rel="icon" href="/logo.png" />
      </Head>

      <main className={styles.main}>
        <Image alt="kara-logo" src={"/logo.png"} width={128} height={128}/>
        <div style={{display: 'flex', flexDirection:'column', alignItems:'center', justifyContent:'center'}}>
          <h1 style={{ fontSize: 64, padding:0, margin:0}} className={GradinetText.main_text}>Kara Web3</h1>
          <h style={{ fontSize: 32}}>Quiz & Rewards Dashboard</h>
        </div>
        <div style={{margin: 40}}>
          {!isLoading && (<Button onClick={connectWallet} style={{borderRadius: 20, fontSize: 18}} inverted color='purple'>
            Connect Wallet
          </Button>)}
          <Loader style={{zIndex:-1}} active={isLoading} inline='centered'  />
        </div>
      </main>
    </div>
  )
}
