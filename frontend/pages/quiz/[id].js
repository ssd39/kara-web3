import { useEffect, useState } from "react"
import { useRouter } from 'next/router'
import { Button, Loader, Radio } from 'semantic-ui-react'
import styles from '../../styles/Home.module.css'
import Head from 'next/head'

export default function Quiz(){
    let wallet;
    if (typeof window !== "undefined") {
      wallet = window.wallet
    }
    const [pageLoading, setPageLoading] = useState(true)
    const [isError, setError] = useState("")
    const [quizId, setQuizId] = useState("")
    const [quizData, setQuizData] = useState(null)
    const [currQuestion , setCQ] = useState(0)
    const [reward , setReward] = useState(0)
    const [showReward, setShowReward] = useState(false)
    const [isAns, setAns] = useState("")
    const [finalAns, setFinalAns] = useState({})
    const router = useRouter()
    useEffect(()=>{
        if(router.isReady){
            (async ()=>{
                let isSignedIn = await wallet.startUp();
                if (!isSignedIn) {
                    console.log(router.asPath)
                    router.push(`/?redirect_url=${router.asPath}`)
                }else{
                    setQuizId(router.query.id)
                }
            })()
        }
    },[router, router.isReady, wallet])

    useEffect(()=>{
        if(router.asPath.includes("errorMessage") || router.asPath.includes("transactionHashes")){
            router.push(`/`)
        }
        if(quizId){
            console.log(quizId)
            fetch(`https://kara-web3.onrender.com/quiz/${quizId}`).then(async (res)=>{
                if(res.status==200){
                    let res_json = await res.json()
                    if(res_json.sucess){
                        setQuizData(res_json.result)
                        setPageLoading(false)
                    }else{
                        setError(res_json.message)
                        setPageLoading(false)
                    }
                }else{
                    setError("Something went wrong!")
                    setPageLoading(false)
                }
            }).catch((e)=>{
                console.error(e)
            })
        }
    },[quizId])

    return(
        <div className={styles.container}>
                  <Head>
                    <title>Kara Web3 - Quiz</title>
                    <meta name="description" content="Kara Web3 Reward Dashboard" />
                    <link rel="icon" href="/logo.png" />
                    </Head>
            <main className={styles.main}>
                <Loader active={pageLoading} inline='centered' />
                {!pageLoading && !isError && !showReward && (
                    <div style={{display:'flex', flexDirection:'column', justifyContent:'center',alignItems:'center'}}>
                        <h1>{currQuestion+1} of {quizData.length}</h1>
                        <div>
                            <div>
                                <h1>{quizData[currQuestion].q}</h1>
                            </div>
                            <div style={{display:'flex', flexDirection:'column',alignItems:'center',justifyContent:'center',  margin:20}}>
                                <div style={{display:'flex', flexDirection:'column'}}>
                                    <Radio
                                        label={quizData[currQuestion].a}
                                        name='radioGroup'
                                        value='a'
                                        checked={isAns === 'a'}
                                        onChange={(e, { value })=>{
                                            setAns(value)
                                        }}
                                        style={{fontSize:22,fontWeight:'400', margin:5}}
                                    />
                                    <Radio
                                        label={quizData[currQuestion].b}
                                        name='radioGroup'
                                        value='b'
                                        checked={isAns === 'b'}
                                        onChange={(e, { value })=>{
                                            setAns(value)
                                        }}
                                        style={{fontSize:22,fontWeight:'400', margin:5}}
                                    />
                                    <Radio
                                        label={quizData[currQuestion].c}
                                        name='radioGroup'
                                        value='c'
                                        checked={isAns === 'c'}
                                        onChange={(e, { value })=>{
                                            setAns(value)
                                        }}
                                        style={{fontSize:22,fontWeight:'400', margin:5}}
                                    />
                                    <Radio
                                        label={quizData[currQuestion].d}
                                        name='radioGroup'
                                        value='d'
                                        checked={isAns === 'd'}
                                        onChange={(e, { value })=>{
                                            setAns(value)
                                        }}
                                        style={{fontSize:22,fontWeight:'400', margin:5}}
                                    />
                                </div>
                            </div>
                        </div>
                        <div style={{margin:10}}>
                            <Button onClick={async ()=>{
                                if(currQuestion+1>=quizData.length){
                                    //submit answers to server
                                    setPageLoading(true)
                                    const fa = finalAns
                                    fa[quizData[currQuestion].aid] = isAns
                                    let reward = await fetch(`https://kara-web3.onrender.com/quiz/${quizId}/finish`,{
                                        method:'POST',
                                        headers:{
                                            "Content-Type":"application/json"
                                        },
                                        body: JSON.stringify({
                                            uid: wallet.accountId,
                                            answers: fa
                                        })
                                    })
                                    let reward_json = await reward.json()
                                    if(reward_json.sucess){
                                        setReward(reward_json.reward)
                                        setShowReward(true)
                                        setPageLoading(false)
                                    }else{
                                        setError(reward_json.message)
                                    }
                                    return;
                                }
                                const ans = isAns
                                setAns("")
                                const fa = finalAns
                                fa[quizData[currQuestion].aid] = ans
                                setFinalAns(fa)
                                setCQ(currQuestion+1)

                            }} disabled={!isAns} inverted color='violet'>
                               {currQuestion+1==quizData.length?'Submit':'Next'}
                            </Button> 
                        </div>
                    </div>
                )}
                {!pageLoading && isError &&(
                    <div style={{display:'flex', flexDirection:'column', justifyContent:'center',alignItems:'center'}}>
                        <h1 style={{fontSize:64}}>😢</h1>
                        <h1 style={{fontSize:64}}>{isError}</h1>
                    </div>
                )}
                {!pageLoading && !isError && showReward &&(
                    <div style={{display:'flex', flexDirection:'column', justifyContent:'center',alignItems:'center'}}>
                        <h1 style={{fontSize:64, color:'#FFD700', margin:0}}>Congratulations 🎉</h1>
                        <h1 style={{fontSize:64, display:'flex', justifyContent:'center', alignItems:'center', margin:0}}>You earned <h1 style={{color:'green', fontSize:64, margin:15, fontWeight:'bolder'}}>{reward}</h1> Kara Tokens</h1>
                        <Button onClick={()=>{
                            setPageLoading(true) 
                            wallet.callMethod({
                                contractId:"karaforheri.testnet", 
                                method:"mint", 
                                args:{
                                    amount: parseInt(reward)
                                }
                            })
                        }} style={{fontSize:20, margin:25}} inverted color='violet'>
                            Claim Reward
                        </Button> 
                    </div>
                )}
            </main>
        </div>
    )
}