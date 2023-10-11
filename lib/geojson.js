export function generateGeoJson(dataItems) {
  const features = dataItems
    .filter(item => item.computedMetadata?.envelope)
    .map(item => ({
      type: 'Feature',
      geometry: item.computedMetadata.envelope,
      properties: {
        id: item.hash,
        name: item.name,
        size: item.size,
        format: item.dataFormat
      }
    }))

  return {type: 'FeatureCollection', features}
}
