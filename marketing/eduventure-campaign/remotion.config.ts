import { Config } from '@remotion/cli/config'

// Renders read assets/ as the public folder (staticFile('audio/...')). JPEG frames, 3 at a time: this laptop has ~16 GB RAM.
Config.setPublicDir('assets')
Config.setEntryPoint('source/index.ts')
Config.setVideoImageFormat('jpeg')
Config.setJpegQuality(95)
Config.setConcurrency(3)
