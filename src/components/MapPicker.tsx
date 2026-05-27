import { onMount, onCleanup, createEffect, createSignal } from 'solid-js'
import L from 'leaflet'
import type { GpsCoords } from '../store'

// Fix default Leaflet marker icons broken by Vite bundling
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})

const TILE_LAYERS = {
  street: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles © Esri — Esri, USGS, AEX, Getmapping, GeoEye, IGN, IGP, UPR-EGP',
    maxZoom: 19,
  },
} as const

type LayerKey = keyof typeof TILE_LAYERS

interface MapPickerProps {
  coords: GpsCoords | null
  onPick: (coords: GpsCoords) => void
}

export default function MapPicker(props: MapPickerProps) {
  let containerRef!: HTMLDivElement
  let map: L.Map | null = null
  let marker: L.Marker | null = null
  let tileLayer: L.TileLayer | null = null

  const [layer, setLayer] = createSignal<LayerKey>('street')

  onMount(() => {
    map = L.map(containerRef, {
      center: [20, 0],
      zoom: 2,
      zoomControl: true,
      attributionControl: true,
    })

    const cfg = TILE_LAYERS[layer()]
    tileLayer = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      maxZoom: cfg.maxZoom,
    }).addTo(map)

    map.on('click', (e: L.LeafletMouseEvent) => {
      props.onPick({ lat: e.latlng.lat, lng: e.latlng.lng })
    })

    if (props.coords) placeMarker(props.coords)
  })

  onCleanup(() => {
    map?.remove()
    map = null
    marker = null
    tileLayer = null
  })

  function placeMarker(coords: GpsCoords) {
    if (!map) return
    if (marker) {
      marker.setLatLng([coords.lat, coords.lng])
    } else {
      marker = L.marker([coords.lat, coords.lng]).addTo(map)
    }
    map.setView([coords.lat, coords.lng], Math.max(map.getZoom(), 10))
  }

  createEffect(() => {
    const c = props.coords
    if (c) placeMarker(c)
    else if (marker && map) { map.removeLayer(marker); marker = null }
  })

  function switchLayer(key: LayerKey) {
    if (!map || !tileLayer) return
    map.removeLayer(tileLayer)
    const cfg = TILE_LAYERS[key]
    tileLayer = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      maxZoom: cfg.maxZoom,
    }).addTo(map)
    setLayer(key)
  }

  return (
    <div class="map-container">
      {/* Leaflet map */}
      <div ref={containerRef} class="map-inner" />

      {/* Layer toggle - top right corner */}
      <div class="map-layer-toggle">
        <button
          class="map-layer-btn"
          classList={{ 'map-layer-btn--active': layer() === 'street' }}
          onClick={() => switchLayer('street')}
          title="Street map"
        >
          Map
        </button>
        <button
          class="map-layer-btn"
          classList={{ 'map-layer-btn--active': layer() === 'satellite' }}
          onClick={() => switchLayer('satellite')}
          title="Satellite imagery"
        >
          Satellite
        </button>
      </div>
    </div>
  )
}
