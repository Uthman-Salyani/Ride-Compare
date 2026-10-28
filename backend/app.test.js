// Week 9: every endpoint now needs an API key. Set it BEFORE index.js is loaded.
process.env.API_KEYS = 'test:test-key-123'
const KEY = 'test-key-123'

const mockConnect = jest.fn()
const mockQuery = jest.fn()

jest.mock('mysql2', () => ({
  createConnection: jest.fn(() => ({
    connect: mockConnect,
    query: mockQuery
  }))
}))

const request = require('supertest')
const app = require('./index')

// Every request sends the API key header
const api = {
  get: url => request(app).get(url).set('X-API-Key', KEY)
}

function mockQueryOnce(expectedSql, rows, expectedParams) {
  mockQuery.mockImplementationOnce((sql, params, callback) => {
    let queryParams = params
    let queryCallback = callback

    if (typeof params === 'function') {
      queryCallback = params
      queryParams = undefined
    }

    expect(sql).toContain(expectedSql)

    if (expectedParams !== undefined) {
      expect(queryParams).toEqual(expectedParams)
    }

    queryCallback(null, rows)
  })
}

describe('GET /providers', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('returns the provider list in contract shape', async () => {
    // Arrange
    mockQueryOnce('SELECT * FROM providers', [
      { id: 'prov_littlecab', name: 'Little Cab' },
      { id: 'prov_bolt', name: 'Bolt' }
    ])

    // Act
    const res = await api.get('/providers')

    // Assert
    expect(res.status).toBe(200)
    expect(res.body).toEqual([
      {
        id: 'prov_littlecab',
        name: 'Little Cab',
        logoUrl: 'https://cdn.ridecompare.co.ke/logos/prov_littlecab.png'
      },
      {
        id: 'prov_bolt',
        name: 'Bolt',
        logoUrl: 'https://cdn.ridecompare.co.ke/logos/prov_bolt.png'
      }
    ])
  })

  it('returns an empty list when no providers exist', async () => {
    // Arrange
    mockQueryOnce('SELECT * FROM providers', [])

    // Act
    const res = await api.get('/providers')

    // Assert
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })
})

describe('GET /landmarks', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('returns the landmark list in contract shape', async () => {
    // Arrange
    mockQueryOnce('SELECT * FROM landmarks', [
      { id: 1, name: 'KICC', latitude: '-1.2924', longitude: '36.8219' },
      { id: 2, name: 'Uhuru Park', latitude: '-1.2897', longitude: '36.8172' }
    ])

    // Act
    const res = await api.get('/landmarks')

    // Assert
    expect(res.status).toBe(200)
    expect(res.body).toEqual([
      {
        id: '1',
        name: 'KICC',
        location: { lat: -1.2924, lng: 36.8219 }
      },
      {
        id: '2',
        name: 'Uhuru Park',
        location: { lat: -1.2897, lng: 36.8172 }
      }
    ])
  })

  it('returns an empty list when there are no landmarks', async () => {
    // Arrange
    mockQueryOnce('SELECT * FROM landmarks', [])

    // Act
    const res = await api.get('/landmarks')

    // Assert
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })
})

describe('GET /landmarks/:id', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('returns a single landmark when the id exists', async () => {
    // Arrange
    mockQueryOnce('SELECT * FROM landmarks WHERE id = ?', [
      { id: 7, name: 'KICC', latitude: '-1.2924', longitude: '36.8219' }
    ], ['7'])

    // Act
    const res = await api.get('/landmarks/7')

    // Assert
    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      id: '7',
      name: 'KICC',
      location: { lat: -1.2924, lng: 36.8219 }
    })
  })

  it('returns 404 when the landmark id does not exist', async () => {
    // Arrange
    mockQueryOnce('SELECT * FROM landmarks WHERE id = ?', [], ['9999'])

    // Act
    const res = await api.get('/landmarks/9999')

    // Assert
    expect(res.status).toBe(404)
    expect(res.body).toEqual({
      code: 'NOT_FOUND',
      message: "No landmark found with id '9999'"
    })
  })
})

describe('GET /rides', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('returns filtered and sorted ride estimates for a valid request', async () => {
    // Arrange
    mockQueryOnce('FROM ride_types r', [
      {
        id: 'ride_est_2b1c',
        provider_id: 'prov_bolt',
        provider_name: 'Bolt',
        type: 'Boda',
        vehicle_type: 'Boda',
        base_fare: '180',
        eta_min: '4',
        capacity: '1'
      },
      {
        id: 'ride_est_9f3a',
        provider_id: 'prov_littlecab',
        provider_name: 'Little Cab',
        type: 'Standard',
        vehicle_type: 'Standard',
        base_fare: '450',
        eta_min: '7',
        capacity: '4'
      }
    ])

    // Act
    const res = await api
      .get('/rides')
      .query({
        pickup_lat: '-1.2864',
        pickup_lng: '36.8172',
        dropoff_lat: '-1.3197',
        dropoff_lng: '36.8271',
        type: 'Standard',
        sort: 'eta'
      })

    // Assert
    expect(res.status).toBe(200)
    expect(res.body).toEqual([
      {
        id: 'ride_est_9f3a',
        providerId: 'prov_littlecab',
        providerName: 'Little Cab',
        rideType: 'Standard',
        fare: { currency: 'KES', amount: 450 },
        etaMinutes: 7,
        capacity: 4
      }
    ])
  })

  it('returns 400 when a required coordinate is missing or invalid', async () => {
    // Arrange
    mockQuery.mockImplementationOnce(() => {
      throw new Error('database query should not run for invalid input')
    })

    // Act
    const res = await api.get('/rides').query({
      pickup_lat: 'abc',
      pickup_lng: '36.8172',
      dropoff_lat: '-1.3197',
      dropoff_lng: '36.8271'
    })

    // Assert
    expect(res.status).toBe(400)
    expect(res.body).toEqual({
      code: 'INVALID_PARAMETER',
      message: "'pickup_lat', 'pickup_lng', 'dropoff_lat', and 'dropoff_lng' must be valid floats"
    })
  })

  it('accepts zero-valued coordinates and returns an empty result set', async () => {
    // Arrange
    mockQueryOnce('FROM ride_types r', [])

    // Act
    const res = await api.get('/rides').query({
      pickup_lat: '0',
      pickup_lng: '0',
      dropoff_lat: '0',
      dropoff_lng: '0'
    })

    // Assert
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })
})

describe('GET /rides/:id', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('returns a single ride estimate when the id exists', async () => {
    // Arrange
    mockQueryOnce('WHERE r.id = ?', [
      {
        id: 'ride_est_9f3a',
        provider_id: 'prov_littlecab',
        provider_name: 'Little Cab',
        type: 'Standard',
        base_fare: '450',
        eta_min: '7',
        capacity: '4'
      }
    ], ['ride_est_9f3a'])

    // Act
    const res = await api.get('/rides/ride_est_9f3a')

    // Assert
    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      id: 'ride_est_9f3a',
      providerId: 'prov_littlecab',
      providerName: 'Little Cab',
      rideType: 'Standard',
      fare: { currency: 'KES', amount: 450 },
      etaMinutes: 7,
      capacity: 4
    })
  })

  it('returns 404 when the ride estimate id does not exist', async () => {
    // Arrange
    mockQueryOnce('WHERE r.id = ?', [], ['ride_est_missing'])

    // Act
    const res = await api.get('/rides/ride_est_missing')

    // Assert
    expect(res.status).toBe(404)
    expect(res.body).toEqual({
      code: 'NOT_FOUND',
      message: "No ride estimate found with id 'ride_est_missing'"
    })
  })
})