import 'semantic-ui-css/semantic.min.css'
import '../styles/globals.css'
import { Wallet } from '../utils/near-wallet';

function MyApp({ Component, pageProps }) {
  if (typeof window !== "undefined") {
    if(!window.wallet){
      window.wallet = new Wallet({ createAccessKeyFor: "dev-1668845510570-18588279301981" })
    }
  }
  return <Component {...pageProps} />
}

export default MyApp
