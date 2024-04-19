import { AppProps } from "next/app";
import '../styles/globals.css';
import '../styles/MyCalendar.css'
import '../react-big-calendar/src/addons/dragAndDrop/styles.scss'
// import '../styles/App.css';

const App = ({ Component, pageProps }: AppProps) => {
  return (
    <Component {...pageProps} />
  );
};

export default App;
