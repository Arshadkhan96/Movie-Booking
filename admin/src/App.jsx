import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import ListMoviesPage from './component/ListMoviesPage'
import Dashboard from './pages/Dashboard'
import BookingsPage from './pages/BookingsPage'
const App = () => {
  return (
    <Routes>
      <Route path='/' element={<Home/>}/>
      <Route path='/listMovies' element={<ListMoviesPage/>}/>
      <Route path='/dashboard' element={<Dashboard/>}/>
      <Route path='/bookings' element={<BookingsPage/>}/>

    </Routes>
      
  )
}

export default App
