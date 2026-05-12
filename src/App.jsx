import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'

const Card = ({ title }) => {

  const [hasLiked, setHasLiked] = useState(false);
  return ( 
    <div className='card'>
      <h2>{title}</h2>

      <button className='button' onClick={() => setHasLiked(!hasLiked)}>
        {hasLiked ? '❤️' : '🤍'}</button>
    </div>)
}

const App = () => {
  return (
    <div className="card-container">
      <Card title ="Inception"/>
      <Card title ="Titanic"/>
      <Card title ="Avatar"/>
    </div>
  )
}

export default App
