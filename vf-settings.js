  // Define the component options
  VueFlow.component({
    setup() {
      // satatic variables
      const baseUrl = 'https://live.api-server.io/run/v1/6385e198ed8a764d89fd71e3?location='

      // reactive variables
      const camps = Vue.ref([])
      const error = Vue.ref(false)
      const location = Vue.ref(null)
      const slug = Vue.ref(null)
      const ageFilter = Vue.ref("all")

      const priceMap = {
        "*": {
          5: 300,
          4: 240,
          3: 195,
          1: 65
        },
        "hobbledown": {
          5: 325,
          4: 239
        },
      }

      Vue.onMounted(async function() {
        // Get the location from the CMS field
        location.value = document.getElementById('cmsQueryString').textContent
        slug.value = document.getElementById('cmsSlug').textContent

        // Call the api endpoint
        const res = await fetch(baseUrl + location.value);

        // Handle errors
        if (!res.ok) {
          error.value = true
        }

        // Set the camps
        let resData = await res.json()

        // sort the camps
        if (Array.isArray(resData)) {
        
        let fromDate = new Date()
          let fromDay = fromDate.getDate() - 7
          fromDate.setDate(fromDay)
          
          let futureCamps = resData.filter(function(camp) {            
            return new Date(camp.sessions[0].date) >= fromDate
          })

          let sortedCamps = futureCamps.sort(function(a,b){
            return new Date(a.sessions[0].date) - new Date(b.sessions[0].date);
          })

          sortedCamps.forEach(function(camp) {
            camp.startDate = camp.sessions[0].date
          })

          camps.value = sortedCamps
        }

      })

      const filteredCamps = Vue.computed(function() {
        let value = []

        if (camps.value == null) {
          return value
        }
        //let value = camps.value
        if (ageFilter.value === "all") {
          return camps.value
        }

        if (ageFilter.value === "all") {
          return camps.value
        } else {
          return camps.value.filter(function(camp) {            
            let ageTags = getTags(camp, "AgeRange")

            // Return boolean if the currentFilter is in the tags
            return ageTags.includes(ageFilter.value);
          });
        }
      })

      const groupedCamps = Vue.computed(function() {
        // Group by date
        let groupedCamps = []
        filteredCamps.value.forEach(function(camp) {
          let match = groupedCamps.find(x => x.date === camp.startDate)
          if (match) {
            match.camps.push(camp)
          } else {
            groupedCamps.push(
              {
                date: camp.startDate,
                camps: [camp],
                location: camp.location,
                productGroup: getProductGroup(camp)
              }
            )
          }
        })

        return groupedCamps
      })

      // Computed methods
      const filterCount = Vue.computed(function() {
        return filteredCamps.value.length
      })

      function getPrettyName(name) {
        return name.split(/-(.+)/)[1].trim()
      }

      function getPrettyAgeRange(camp) {
        return getTags(camp, 'AgeRange').join(', ')
      }

      function getProductGroup(camp) {
        return getTags(camp, 'ProductGroup')[0]
      }

      function getTags(camp, type) {
        return camp.product_tags.find(function(tag) {
          return tag.category === type
        }).tags || []
      }

      function getCampDate(camp) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
        const startDate = new Date(camp.sessions[0].date)
        return startDate.toLocaleDateString("en-US", options)
      }

      function formatDate(dateStr) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
        const startDate = new Date(dateStr)
        return startDate.toLocaleDateString("en-US", options)
      }

      function getBasePrice(location, days) {
        let basePrice = undefined
        if (priceMap.hasOwnProperty(location)) {
          basePrice = priceMap[location][days]
        } else {
          basePrice = priceMap["*"][days]
        }
        return basePrice
      }

      function getCampWeekSaving(camp) {
        let price = camp.product_unit_price
        let daysInWeek = camp.sessions.length
        let saving = 0

        let fullPrice = getBasePrice(slug.value, daysInWeek)

        if (price && fullPrice) {
          saving = toDecimal(fullPrice - price)
        }

        return saving
      }

      function getCampDaySaving(session) {
        let price = session.price
        let fullPrice = getBasePrice(slug.value, 1)
        let saving = 0

        if (price && fullPrice) {
          saving = toDecimal(fullPrice - price)
        }

        return saving
      }

      function getCampWeekDayPrice(camp) {
        let price = camp.product_unit_price
        let daysInWeek = camp.sessions.length

        return toDecimal(price / daysInWeek)
      }

      function toDecimal(value) {
        return new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
      }

      function getStatus(quantityAvailability) {
        let available = false;
        const total = quantityAvailability.amount;
        const remaining = quantityAvailability.remaining;
        const percentageBooked = (100 * remaining) / total;

        if (remaining === 0 && total === 0) {
          return 'not_available'
        } else if (remaining === 0) {
          return 'sold_out'
        } else if (percentageBooked < 50) {
          return 'limited_spaces'
        } else {
          return 'available'
        }
      }

      function getSessionWithBlankDays(sessions) {
        let sessionsWithBlanks = []

        // Loop over days of the week
        // IMPORTANT THIS ONLY SUPPORTS MON - FRIDAY!!!
        for (let i = 1; i < 6; i++) {
          let hasEvent = false
          // Loop over sessions to find the corresponding date
          for (const [index, session] of sessions.entries()) {
            // Create date object from the date string
            const sessionDate = new Date(session.date)
            // Day index (Sun=0, Mon=1)
            const sessionDateDayIndex = sessionDate.getDay()

            if (sessionDateDayIndex === i) {
              hasEvent = true
              sessionsWithBlanks.push(session)
              break //This breaks the session loop not the day loop
            }
          }

          if (!hasEvent) {
            sessionsWithBlanks.push({
              id: -1
            })
          }
        }

        return sessionsWithBlanks
      }

      return {
        camps,
        error,
        getTags,
        getPrettyAgeRange,
        getPrettyName,
        ageFilter,
        filterCount,
        filteredCamps,
        groupedCamps,
        getCampDate,
        formatDate,
        getStatus,
        getSessionWithBlankDays,
        getCampWeekSaving,
        getCampDaySaving,
        getCampWeekDayPrice,
        location,
        slug
      }
    }
  })
