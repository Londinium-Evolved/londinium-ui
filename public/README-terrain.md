# Terrain LIDAR Data Guide

## Sample Data for Development

For development purposes, you need a sample GeoTIFF file named `sample_lidar_data.tiff` in this directory.

You can download sample LIDAR data from various sources:

1. **USGS Earth Explorer**: https://earthexplorer.usgs.gov/
2. **OpenTopography**: https://opentopography.org/
3. **UK Environment Agency**: https://environment.data.gov.uk/DefraDataDownload/?Mode=survey

## Development Notes

The sample file should be a GeoTIFF file with elevation data. For London-specific testing, we recommend using:

1. **London LiDAR Height Data**: Data from the Environment Agency covering parts of London
2. **Greater London LiDAR**: Composite dataset covering the Greater London area

## Data Preprocessing

For optimal performance in the application:

1. Ensure your GeoTIFF is properly georeferenced
2. Recommended resolution: 1024x1024 pixels
3. Downsample larger datasets for development testing

## Production Environment

In production, the application will fetch LIDAR data from an API endpoint:
`/api/terrain/lidar/london`

This endpoint should return a GeoTIFF file with the appropriate data for the application.

## Troubleshooting

If you encounter issues with terrain loading:

1. Check that the GeoTIFF format is properly formed
2. Verify that the data includes elevation values (not just RGB data)
3. Ensure the sample file is in the correct location (public directory)
4. The console will show detailed error messages if the LIDAR data cannot be processed
