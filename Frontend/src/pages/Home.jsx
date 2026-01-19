import React from 'react'
import Navbar from '../components/Navbar'
import Banner from '../components/Banner'
import Movies from '../components/Movies'
import Trailers from '../components/Trailers'
import News from '../components/News'
import Footer from '../components/Footer'

const Home = () => {
  return (
    <div>
      <Navbar/>
      <Banner/>
      <Movies/>
      <Trailers/>
      <News/>
      <Footer/>
    </div>
  )
}

export default Home
