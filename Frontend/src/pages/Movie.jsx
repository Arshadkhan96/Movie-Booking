import React from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import MoviePage from '../components/MoviePage'

const Movie = () => {
  return (
    <div>
      <Navbar/>
        <MoviePage/>
      <Footer/>
    </div>
  )
}

export default Movie
