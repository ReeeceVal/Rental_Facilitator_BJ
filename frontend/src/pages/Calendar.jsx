import { useState, useEffect } from 'react'
import { Calendar as CalendarIcon, Filter, ChevronLeft, ChevronRight, Eye } from 'lucide-react'
import Button from '../components/ui/Button'
import { invoicesAPI } from '../services/api'
import { formatCurrency, formatDate } from '../utils/helpers'

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    active: 0,
    upcoming: 0,
    conflicts: 0
  })

  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth() + 1

  useEffect(() => {
    fetchCalendarEvents()
  }, [currentYear, currentMonth])

  const fetchCalendarEvents = async () => {
    try {
      setLoading(true)
      const response = await invoicesAPI.getCalendarEvents({ 
        year: currentYear, 
        month: currentMonth 
      })
      
      if (response.data.success) {
        setEvents(response.data.events)
        calculateStats(response.data.events)
      }
    } catch (error) {
      console.error('Error fetching calendar events:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (eventsList) => {
    const today = new Date()
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    
    let active = 0
    let upcoming = 0
    let conflicts = 0
    
    eventsList.forEach(event => {
      const startDate = new Date(event.start)
      const endDate = new Date(event.end)
      
      // Active rentals (currently ongoing)
      if (startDate <= today && endDate >= today) {
        active++
      }
      
      // Upcoming returns (ending in next 7 days)
      if (endDate >= today && endDate <= nextWeek) {
        upcoming++
      }
    })
    
    // Check for conflicts (overlapping rentals with same equipment)
    const equipmentRentals = {}
    eventsList.forEach(event => {
      event.equipment.forEach(eq => {
        if (!equipmentRentals[eq.name]) {
          equipmentRentals[eq.name] = []
        }
        equipmentRentals[eq.name].push({
          start: new Date(event.start),
          end: new Date(event.end),
          quantity: eq.quantity
        })
      })
    })
    
    Object.values(equipmentRentals).forEach(rentals => {
      for (let i = 0; i < rentals.length; i++) {
        for (let j = i + 1; j < rentals.length; j++) {
          const rental1 = rentals[i]
          const rental2 = rentals[j]
          
          // Check for overlap
          if (rental1.start <= rental2.end && rental2.start <= rental1.end) {
            conflicts++
            break
          }
        }
      }
    })
    
    setStats({ active, upcoming, conflicts })
  }

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate)
    newDate.setMonth(newDate.getMonth() + direction)
    setCurrentDate(newDate)
  }

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())
    
    const days = []
    const current = new Date(startDate)
    
    for (let i = 0; i < 42; i++) {
      days.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }
    
    return days
  }

  const getEventsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0]
    return events.filter(event => {
      const eventStart = event.start
      const eventEnd = event.end
      return dateStr >= eventStart && dateStr <= eventEnd
    })
  }

  const isCurrentMonth = (date) => {
    return date.getMonth() === currentDate.getMonth()
  }

  const isToday = (date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const days = getDaysInMonth()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rental Calendar</h1>
          <p className="mt-1 text-sm text-gray-500">
            View rental schedules and equipment availability from invoices
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filter Rentals
          </Button>
          <Button variant="outline">
            <Eye className="mr-2 h-4 w-4" />
            View Options
          </Button>
        </div>
      </div>

      {/* Calendar */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-gray-900">
              {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigateMonth(-1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigateMonth(1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {loading ? (
            <div className="text-center py-12">
              <CalendarIcon className="mx-auto h-12 w-12 text-gray-400 animate-pulse" />
              <p className="mt-2 text-sm text-gray-500">Loading calendar events...</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg">
              {/* Days of week header */}
              <div className="grid grid-cols-7 gap-px bg-gray-200">
                {DAYS_OF_WEEK.map(day => (
                  <div key={day} className="bg-gray-50 py-2 px-3 text-xs font-medium text-gray-500 text-center">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-px bg-gray-200">
                {days.map((day, index) => {
                  const dayEvents = getEventsForDate(day)
                  const isCurrentMonthDay = isCurrentMonth(day)
                  const isTodayDay = isToday(day)
                  
                  return (
                    <div key={index} className={`bg-white min-h-24 p-2 ${
                      !isCurrentMonthDay ? 'bg-gray-50 text-gray-400' : ''
                    } ${
                      isTodayDay ? 'bg-blue-50' : ''
                    }`}>
                      <div className={`text-sm font-medium mb-1 ${
                        isTodayDay ? 'text-blue-600' : isCurrentMonthDay ? 'text-gray-900' : 'text-gray-400'
                      }`}>
                        {day.getDate()}
                      </div>
                      
                      {dayEvents.length > 0 && (
                        <div className="space-y-1">
                          {dayEvents.slice(0, 2).map(event => (
                            <div
                              key={event.id}
                              className={`text-xs px-2 py-1 rounded truncate ${
                                event.status === 'paid' 
                                  ? 'bg-green-100 text-green-800'
                                  : event.status === 'sent'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                              title={`${event.customer} - ${event.invoiceNumber}\n${formatCurrency(event.totalAmount)}`}
                            >
                              {event.customer}
                            </div>
                          ))}
                          {dayEvents.length > 2 && (
                            <div className="text-xs text-gray-500 px-2">
                              +{dayEvents.length - 2} more
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="card-body">
            <h3 className="text-sm font-medium text-gray-900">Active Rentals</h3>
            <p className="text-2xl font-bold text-primary-600 mt-2">{stats.active}</p>
            <p className="text-sm text-gray-500 mt-1">Currently rented</p>
          </div>
        </div>
        
        <div className="card">
          <div className="card-body">
            <h3 className="text-sm font-medium text-gray-900">Upcoming Returns</h3>
            <p className="text-2xl font-bold text-orange-600 mt-2">{stats.upcoming}</p>
            <p className="text-sm text-gray-500 mt-1">Next 7 days</p>
          </div>
        </div>
        
        <div className="card">
          <div className="card-body">
            <h3 className="text-sm font-medium text-gray-900">Equipment Conflicts</h3>
            <p className="text-2xl font-bold text-red-600 mt-2">{stats.conflicts}</p>
            <p className="text-sm text-gray-500 mt-1">Overlapping rentals</p>
          </div>
        </div>
      </div>
    </div>
  )
}