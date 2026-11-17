/* ============================================================
   theme.js — motore cromatico multi-palette (Ed. XV)
   e gestione automatica tema chiaro / scuro di sistema
   ============================================================ */
import { state, PAL, markDirty } from './data.js';

export const PALETTES = [
  {
    id: 'amber',
    name: 'Ambra Fossile',
    subtitle: 'Ossidiana vulcanica · Oro solare e resina',
    swatches: ['#1a0d06', '#f2a65a', '#f5ede1'],
    dark: {
      css: {
        '--bg': '#070504',
        '--panel-top': 'rgba(26, 15, 10, 0.84)',
        '--panel-bot': 'rgba(10, 6, 4, 0.92)',
        '--glass-solid': 'rgba(13, 8, 5, 0.96)',
        '--ink': '#fbf2e6',
        '--mute': '#c9b098',
        '--line': 'rgba(242, 166, 90, 0.16)',
        '--line-strong': 'rgba(242, 166, 90, 0.34)',
        '--specular': 'rgba(255, 236, 210, 0.12)',
        '--acc': '#f2a65a',
        '--acc-2': '#df8238',
        '--acc-ink': '#240f04',
        '--chip-bg': 'rgba(242, 166, 90, 0.07)',
        '--chip-hover': 'rgba(242, 166, 90, 0.15)',
        '--shadow': 'rgba(0, 0, 0, 0.78)',
        '--vignette': 'rgba(3, 1, 0, 0.72)',
        '--hud': 'rgba(242, 166, 90, 0.34)',
        '--title-1': '#fff8ee',
        '--title-2': '#f4ba7a',
        '--sub-ink': '#ecd3ba',
        '--card-glow': 'rgba(242, 166, 90, 0.12)',
        '--overlay-bg': 'rgba(5, 2, 1, 0.80)',
        '--media-1': '#1a0d06',
        '--media-2': '#050201',
        '--nb-frame': '#1b120c'
      },
      canvas: {
        bg0: '#1f0f07', bg1: '#0b0603', bg2: '#030100',
        spot0: 'rgba(242, 166, 90, 0.14)', spot1: 'rgba(232, 195, 130, 0.05)',
        dust: 'rgba(255, 224, 185, 0.28)',
        ringOuter: 'rgba(242, 166, 90, 0.24)',
        ringInner: 'rgba(242, 166, 90, 0.12)',
        ringMeridian: 'rgba(255, 214, 170, 0.14)',
        art1: 'rgba(242, 166, 90,',
        art2: 'rgba(255, 128, 112,',
        art3: 'rgba(140, 217, 107,',
        artFillAlpha: 0.09,
        artStrokeAlpha: 1.0,
        labelStroke: 'rgba(7, 5, 4, 0.94)',
        geoBg0: '#1d0e07', geoBg1: '#0b0603', geoBg2: '#030100',
        geoSphereFill: 'rgba(242, 166, 90, 0.04)',
        geoSphereStroke: 'rgba(242, 166, 90, 0.32)',
        geoGrat: 'rgba(255, 214, 170, 0.10)',
        geoLandFill: 'rgba(68, 34, 18, 0.60)',
        geoLandStroke: 'rgba(242, 166, 90, 0.56)',
        geoHalo0: 'rgba(242, 166, 90, 0.30)',
        geoPin: '#f2a65a',
        geoLabelInk: 'rgba(251, 242, 230, 0.96)',
        geoLabelSub: 'rgba(242, 166, 90, 0.94)',
        focusDim: 'rgba(6, 3, 1, 0.48)',
        switchFlash: 'rgba(7, 5, 4, 0.92)',
        linkHighlight: '#f2a65a',
        cardShadow: 'rgba(4, 2, 1, 0.56)',
        cardShadowBig: 'rgba(4, 2, 1, 0.76)',
        cardPaper: ['#261810', '#180f0a', '#100906'],
        cardInner: 'rgba(242, 166, 90, 0.28)',
        cardOuter: 'rgba(242, 166, 90, 0.52)',
        cardCode: 'rgba(245, 216, 182, 0.82)',
        dotRing: '#fbf2e6'
      },
      cats: {
        'Archaeopteryx': '#f2a65a',
        'Pettirossi': '#ff6b57',
        'Grilli': '#8cd96b',
        'da classificare': '#b39ddb'
      }
    },
    light: {
      css: {
        '--bg': '#f6efe4',
        '--panel-top': 'rgba(255, 250, 242, 0.88)',
        '--panel-bot': 'rgba(245, 236, 222, 0.95)',
        '--glass-solid': 'rgba(253, 248, 240, 0.97)',
        '--ink': '#231810',
        '--mute': '#6e5744',
        '--line': 'rgba(138, 86, 36, 0.16)',
        '--line-strong': 'rgba(138, 86, 36, 0.32)',
        '--specular': 'rgba(255, 255, 255, 0.75)',
        '--acc': '#b86820',
        '--acc-2': '#954e12',
        '--acc-ink': '#fffaf2',
        '--chip-bg': 'rgba(138, 86, 36, 0.07)',
        '--chip-hover': 'rgba(138, 86, 36, 0.14)',
        '--shadow': 'rgba(48, 30, 14, 0.16)',
        '--vignette': 'rgba(195, 174, 146, 0.35)',
        '--hud': 'rgba(138, 86, 36, 0.35)',
        '--title-1': '#231810',
        '--title-2': '#a85a18',
        '--sub-ink': '#4e3b2c',
        '--card-glow': 'rgba(184, 104, 32, 0.10)',
        '--overlay-bg': 'rgba(35, 24, 16, 0.55)',
        '--media-1': '#efe4d4',
        '--media-2': '#dfd0bc',
        '--nb-frame': '#efe3d1'
      },
      canvas: {
        bg0: '#fbf5ec', bg1: '#f2e7d6', bg2: '#e6d6bf',
        spot0: 'rgba(184, 104, 32, 0.12)', spot1: 'rgba(160, 110, 60, 0.05)',
        dust: 'rgba(138, 86, 36, 0.22)',
        ringOuter: 'rgba(138, 86, 36, 0.24)',
        ringInner: 'rgba(138, 86, 36, 0.14)',
        ringMeridian: 'rgba(138, 86, 36, 0.16)',
        art1: 'rgba(176, 94, 24,',
        art2: 'rgba(196, 68, 48,',
        art3: 'rgba(72, 134, 52,',
        artFillAlpha: 0.08,
        artStrokeAlpha: 0.92,
        labelStroke: 'rgba(250, 243, 232, 0.94)',
        geoBg0: '#faf3e8', geoBg1: '#f0e4d2', geoBg2: '#e4d3ba',
        geoSphereFill: 'rgba(184, 104, 32, 0.05)',
        geoSphereStroke: 'rgba(138, 86, 36, 0.34)',
        geoGrat: 'rgba(138, 86, 36, 0.12)',
        geoLandFill: 'rgba(198, 174, 144, 0.65)',
        geoLandStroke: 'rgba(138, 86, 36, 0.55)',
        geoHalo0: 'rgba(184, 104, 32, 0.26)',
        geoPin: '#b86820',
        geoLabelInk: 'rgba(35, 24, 16, 0.95)',
        geoLabelSub: 'rgba(150, 82, 22, 0.92)',
        focusDim: 'rgba(246, 239, 228, 0.55)',
        switchFlash: 'rgba(246, 239, 228, 0.92)',
        linkHighlight: '#b86820',
        cardShadow: 'rgba(48, 30, 14, 0.22)',
        cardShadowBig: 'rgba(48, 30, 14, 0.36)',
        cardPaper: ['#fffcf7', '#f7efe2', '#ede1ce'],
        cardInner: 'rgba(138, 86, 36, 0.24)',
        cardOuter: 'rgba(138, 86, 36, 0.48)',
        cardCode: 'rgba(92, 58, 28, 0.85)',
        dotRing: '#231810'
      },
      cats: {
        'Archaeopteryx': '#c86d1f',
        'Pettirossi': '#d14334',
        'Grilli': '#4e9636',
        'da classificare': '#7a5fb8'
      }
    }
  },
  {
    id: 'monolith',
    name: 'Prisma Platino',
    subtitle: 'Grafite siderale · Luce ottica e titanio',
    swatches: ['#0d0f14', '#e5c58e', '#f4f5f7'],
    dark: {
      css: {
        '--bg': '#07080a',
        '--panel-top': 'rgba(22, 24, 30, 0.86)',
        '--panel-bot': 'rgba(10, 11, 15, 0.93)',
        '--glass-solid': 'rgba(12, 14, 18, 0.96)',
        '--ink': '#f4f5f7',
        '--mute': '#a6abb6',
        '--line': 'rgba(229, 197, 142, 0.15)',
        '--line-strong': 'rgba(229, 197, 142, 0.30)',
        '--specular': 'rgba(255, 255, 255, 0.10)',
        '--acc': '#e5c58e',
        '--acc-2': '#c7a46b',
        '--acc-ink': '#1a150c',
        '--chip-bg': 'rgba(255, 255, 255, 0.06)',
        '--chip-hover': 'rgba(255, 255, 255, 0.12)',
        '--shadow': 'rgba(0, 0, 0, 0.78)',
        '--vignette': 'rgba(3, 4, 6, 0.70)',
        '--hud': 'rgba(229, 197, 142, 0.30)',
        '--title-1': '#ffffff',
        '--title-2': '#e5c58e',
        '--sub-ink': '#cfd4de',
        '--card-glow': 'rgba(229, 197, 142, 0.09)',
        '--overlay-bg': 'rgba(4, 5, 8, 0.82)',
        '--media-1': '#16181e',
        '--media-2': '#060709',
        '--nb-frame': '#181a20'
      },
      canvas: {
        bg0: '#171920', bg1: '#0b0c10', bg2: '#050608',
        spot0: 'rgba(229, 197, 142, 0.11)', spot1: 'rgba(160, 175, 210, 0.05)',
        dust: 'rgba(226, 232, 245, 0.26)',
        ringOuter: 'rgba(229, 197, 142, 0.22)',
        ringInner: 'rgba(229, 197, 142, 0.11)',
        ringMeridian: 'rgba(200, 210, 230, 0.13)',
        art1: 'rgba(229, 197, 142,',
        art2: 'rgba(255, 118, 102,',
        art3: 'rgba(138, 214, 128,',
        artFillAlpha: 0.08,
        artStrokeAlpha: 0.96,
        labelStroke: 'rgba(7, 8, 10, 0.94)',
        geoBg0: '#16181f', geoBg1: '#0b0c10', geoBg2: '#050608',
        geoSphereFill: 'rgba(229, 197, 142, 0.03)',
        geoSphereStroke: 'rgba(229, 197, 142, 0.28)',
        geoGrat: 'rgba(200, 210, 230, 0.09)',
        geoLandFill: 'rgba(46, 52, 66, 0.62)',
        geoLandStroke: 'rgba(229, 197, 142, 0.48)',
        geoHalo0: 'rgba(229, 197, 142, 0.26)',
        geoPin: '#e5c58e',
        geoLabelInk: 'rgba(244, 245, 247, 0.96)',
        geoLabelSub: 'rgba(229, 197, 142, 0.92)',
        focusDim: 'rgba(5, 6, 8, 0.50)',
        switchFlash: 'rgba(7, 8, 10, 0.92)',
        linkHighlight: '#e5c58e',
        cardShadow: 'rgba(2, 3, 5, 0.58)',
        cardShadowBig: 'rgba(2, 3, 5, 0.78)',
        cardPaper: ['#20232b', '#14161c', '#0d0e13'],
        cardInner: 'rgba(229, 197, 142, 0.24)',
        cardOuter: 'rgba(229, 197, 142, 0.46)',
        cardCode: 'rgba(220, 224, 234, 0.80)',
        dotRing: '#f4f5f7'
      },
      cats: {
        'Archaeopteryx': '#f2a65a',
        'Pettirossi': '#ff6b57',
        'Grilli': '#8cd96b',
        'da classificare': '#b39ddb'
      }
    },
    light: {
      css: {
        '--bg': '#f2f3f5',
        '--panel-top': 'rgba(255, 255, 255, 0.88)',
        '--panel-bot': 'rgba(241, 243, 247, 0.95)',
        '--glass-solid': 'rgba(252, 253, 255, 0.97)',
        '--ink': '#16181d',
        '--mute': '#59606e',
        '--line': 'rgba(30, 38, 54, 0.14)',
        '--line-strong': 'rgba(30, 38, 54, 0.28)',
        '--specular': 'rgba(255, 255, 255, 0.85)',
        '--acc': '#8c6222',
        '--acc-2': '#6e4b16',
        '--acc-ink': '#ffffff',
        '--chip-bg': 'rgba(30, 38, 54, 0.06)',
        '--chip-hover': 'rgba(30, 38, 54, 0.12)',
        '--shadow': 'rgba(20, 26, 38, 0.14)',
        '--vignette': 'rgba(180, 186, 198, 0.34)',
        '--hud': 'rgba(140, 98, 34, 0.32)',
        '--title-1': '#16181d',
        '--title-2': '#8c6222',
        '--sub-ink': '#434956',
        '--card-glow': 'rgba(140, 98, 34, 0.08)',
        '--overlay-bg': 'rgba(22, 24, 29, 0.52)',
        '--media-1': '#e7eaef',
        '--media-2': '#d5dae3',
        '--nb-frame': '#e8ebf0'
      },
      canvas: {
        bg0: '#f9fafb', bg1: '#eef0f4', bg2: '#e1e4eb',
        spot0: 'rgba(140, 98, 34, 0.10)', spot1: 'rgba(90, 110, 145, 0.05)',
        dust: 'rgba(45, 55, 72, 0.20)',
        ringOuter: 'rgba(45, 55, 72, 0.22)',
        ringInner: 'rgba(45, 55, 72, 0.12)',
        ringMeridian: 'rgba(45, 55, 72, 0.14)',
        art1: 'rgba(156, 102, 28,',
        art2: 'rgba(194, 62, 46,',
        art3: 'rgba(64, 132, 54,',
        artFillAlpha: 0.07,
        artStrokeAlpha: 0.90,
        labelStroke: 'rgba(246, 247, 250, 0.94)',
        geoBg0: '#f8f9fb', geoBg1: '#eceef3', geoBg2: '#dfe3eb',
        geoSphereFill: 'rgba(45, 55, 72, 0.04)',
        geoSphereStroke: 'rgba(45, 55, 72, 0.30)',
        geoGrat: 'rgba(45, 55, 72, 0.10)',
        geoLandFill: 'rgba(182, 190, 204, 0.65)',
        geoLandStroke: 'rgba(68, 78, 96, 0.50)',
        geoHalo0: 'rgba(140, 98, 34, 0.24)',
        geoPin: '#8c6222',
        geoLabelInk: 'rgba(22, 24, 29, 0.95)',
        geoLabelSub: 'rgba(140, 98, 34, 0.92)',
        focusDim: 'rgba(242, 243, 245, 0.56)',
        switchFlash: 'rgba(242, 243, 245, 0.92)',
        linkHighlight: '#8c6222',
        cardShadow: 'rgba(20, 26, 38, 0.20)',
        cardShadowBig: 'rgba(20, 26, 38, 0.34)',
        cardPaper: ['#ffffff', '#f5f6f9', '#eaedf2'],
        cardInner: 'rgba(45, 55, 72, 0.20)',
        cardOuter: 'rgba(45, 55, 72, 0.42)',
        cardCode: 'rgba(52, 60, 74, 0.84)',
        dotRing: '#16181d'
      },
      cats: {
        'Archaeopteryx': '#c86d1f',
        'Pettirossi': '#d14334',
        'Grilli': '#4e9636',
        'da classificare': '#7a5fb8'
      }
    }
  },
  {
    id: 'cyanotype',
    name: 'Cianotipia Abissale',
    subtitle: 'Blu di Prussia · Ciano bioluminescente',
    swatches: ['#06131f', '#4ef2f5', '#e4f6ff'],
    dark: {
      css: {
        '--bg': '#040a12',
        '--panel-top': 'rgba(10, 24, 40, 0.86)',
        '--panel-bot': 'rgba(5, 13, 24, 0.94)',
        '--glass-solid': 'rgba(7, 17, 30, 0.96)',
        '--ink': '#e8f6ff',
        '--mute': '#8eb4cc',
        '--line': 'rgba(78, 242, 245, 0.16)',
        '--line-strong': 'rgba(78, 242, 245, 0.32)',
        '--specular': 'rgba(190, 245, 255, 0.12)',
        '--acc': '#4ef2f5',
        '--acc-2': '#26b8d4',
        '--acc-ink': '#031822',
        '--chip-bg': 'rgba(78, 242, 245, 0.07)',
        '--chip-hover': 'rgba(78, 242, 245, 0.15)',
        '--shadow': 'rgba(0, 4, 10, 0.80)',
        '--vignette': 'rgba(1, 4, 9, 0.74)',
        '--hud': 'rgba(78, 242, 245, 0.32)',
        '--title-1': '#f4fbff',
        '--title-2': '#4ef2f5',
        '--sub-ink': '#b8d9ec',
        '--card-glow': 'rgba(78, 242, 245, 0.11)',
        '--overlay-bg': 'rgba(2, 6, 12, 0.82)',
        '--media-1': '#0a1c2e',
        '--media-2': '#030912',
        '--nb-frame': '#0b1b2b'
      },
      canvas: {
        bg0: '#0b2036', bg1: '#05101d', bg2: '#02060c',
        spot0: 'rgba(78, 242, 245, 0.13)', spot1: 'rgba(80, 150, 255, 0.06)',
        dust: 'rgba(165, 238, 255, 0.28)',
        ringOuter: 'rgba(78, 242, 245, 0.24)',
        ringInner: 'rgba(78, 242, 245, 0.12)',
        ringMeridian: 'rgba(140, 215, 255, 0.14)',
        art1: 'rgba(246, 196, 106,',
        art2: 'rgba(255, 118, 122,',
        art3: 'rgba(78, 242, 245,',
        artFillAlpha: 0.09,
        artStrokeAlpha: 0.98,
        labelStroke: 'rgba(4, 10, 18, 0.94)',
        geoBg0: '#0b2036', geoBg1: '#05101d', geoBg2: '#02060c',
        geoSphereFill: 'rgba(78, 242, 245, 0.04)',
        geoSphereStroke: 'rgba(78, 242, 245, 0.32)',
        geoGrat: 'rgba(140, 215, 255, 0.10)',
        geoLandFill: 'rgba(20, 56, 86, 0.62)',
        geoLandStroke: 'rgba(78, 242, 245, 0.54)',
        geoHalo0: 'rgba(78, 242, 245, 0.28)',
        geoPin: '#4ef2f5',
        geoLabelInk: 'rgba(232, 246, 255, 0.96)',
        geoLabelSub: 'rgba(78, 242, 245, 0.92)',
        focusDim: 'rgba(2, 6, 12, 0.50)',
        switchFlash: 'rgba(4, 10, 18, 0.92)',
        linkHighlight: '#4ef2f5',
        cardShadow: 'rgba(1, 4, 10, 0.60)',
        cardShadowBig: 'rgba(1, 4, 10, 0.80)',
        cardPaper: ['#10263d', '#091829', '#050f1b'],
        cardInner: 'rgba(78, 242, 245, 0.25)',
        cardOuter: 'rgba(78, 242, 245, 0.48)',
        cardCode: 'rgba(170, 232, 250, 0.84)',
        dotRing: '#e8f6ff'
      },
      cats: {
        'Archaeopteryx': '#f6c46a',
        'Pettirossi': '#ff767a',
        'Grilli': '#4ef2f5',
        'da classificare': '#a79bff'
      }
    },
    light: {
      css: {
        '--bg': '#ebf4fa',
        '--panel-top': 'rgba(248, 252, 255, 0.88)',
        '--panel-bot': 'rgba(232, 243, 251, 0.95)',
        '--glass-solid': 'rgba(246, 251, 255, 0.97)',
        '--ink': '#0d2233',
        '--mute': '#496a82',
        '--line': 'rgba(16, 98, 138, 0.16)',
        '--line-strong': 'rgba(16, 98, 138, 0.30)',
        '--specular': 'rgba(255, 255, 255, 0.85)',
        '--acc': '#0c7c9e',
        '--acc-2': '#085d78',
        '--acc-ink': '#ffffff',
        '--chip-bg': 'rgba(16, 98, 138, 0.07)',
        '--chip-hover': 'rgba(16, 98, 138, 0.14)',
        '--shadow': 'rgba(12, 42, 66, 0.14)',
        '--vignette': 'rgba(165, 195, 216, 0.34)',
        '--hud': 'rgba(12, 124, 158, 0.34)',
        '--title-1': '#0d2233',
        '--title-2': '#0c7c9e',
        '--sub-ink': '#325269',
        '--card-glow': 'rgba(12, 124, 158, 0.09)',
        '--overlay-bg': 'rgba(13, 34, 51, 0.54)',
        '--media-1': '#dcebf5',
        '--media-2': '#c6dceb',
        '--nb-frame': '#dceaf4'
      },
      canvas: {
        bg0: '#f5fafe', bg1: '#e6f1f8', bg2: '#d5e6f2',
        spot0: 'rgba(12, 124, 158, 0.11)', spot1: 'rgba(40, 120, 190, 0.05)',
        dust: 'rgba(16, 98, 138, 0.22)',
        ringOuter: 'rgba(16, 98, 138, 0.24)',
        ringInner: 'rgba(16, 98, 138, 0.13)',
        ringMeridian: 'rgba(16, 98, 138, 0.15)',
        art1: 'rgba(182, 104, 28,',
        art2: 'rgba(196, 66, 62,',
        art3: 'rgba(12, 124, 158,',
        artFillAlpha: 0.08,
        artStrokeAlpha: 0.92,
        labelStroke: 'rgba(240, 248, 253, 0.94)',
        geoBg0: '#f4f9fd', geoBg1: '#e4eff7', geoBg2: '#d2e3f0',
        geoSphereFill: 'rgba(12, 124, 158, 0.04)',
        geoSphereStroke: 'rgba(16, 98, 138, 0.32)',
        geoGrat: 'rgba(16, 98, 138, 0.11)',
        geoLandFill: 'rgba(164, 196, 218, 0.65)',
        geoLandStroke: 'rgba(16, 98, 138, 0.52)',
        geoHalo0: 'rgba(12, 124, 158, 0.24)',
        geoPin: '#0c7c9e',
        geoLabelInk: 'rgba(13, 34, 51, 0.95)',
        geoLabelSub: 'rgba(12, 124, 158, 0.92)',
        focusDim: 'rgba(235, 244, 250, 0.55)',
        switchFlash: 'rgba(235, 244, 250, 0.92)',
        linkHighlight: '#0c7c9e',
        cardShadow: 'rgba(12, 42, 66, 0.20)',
        cardShadowBig: 'rgba(12, 42, 66, 0.34)',
        cardPaper: ['#ffffff', '#f0f7fc', '#e2eff8'],
        cardInner: 'rgba(16, 98, 138, 0.22)',
        cardOuter: 'rgba(16, 98, 138, 0.44)',
        cardCode: 'rgba(26, 76, 108, 0.84)',
        dotRing: '#0d2233'
      },
      cats: {
        'Archaeopteryx': '#c86d1f',
        'Pettirossi': '#d14334',
        'Grilli': '#0c7c9e',
        'da classificare': '#6e58b8'
      }
    }
  },
  {
    id: 'emerald',
    name: 'Erbario Smeraldo',
    subtitle: 'Foresta giurassica · Linfa e muschio antico',
    swatches: ['#07140d', '#7ee081', '#e8f5ea'],
    dark: {
      css: {
        '--bg': '#050b07',
        '--panel-top': 'rgba(12, 26, 18, 0.86)',
        '--panel-bot': 'rgba(6, 14, 9, 0.94)',
        '--glass-solid': 'rgba(8, 18, 12, 0.96)',
        '--ink': '#eaf6ec',
        '--mute': '#95b89e',
        '--line': 'rgba(126, 224, 129, 0.16)',
        '--line-strong': 'rgba(126, 224, 129, 0.32)',
        '--specular': 'rgba(210, 255, 220, 0.11)',
        '--acc': '#7ee081',
        '--acc-2': '#4eb85c',
        '--acc-ink': '#061c0b',
        '--chip-bg': 'rgba(126, 224, 129, 0.07)',
        '--chip-hover': 'rgba(126, 224, 129, 0.15)',
        '--shadow': 'rgba(0, 6, 2, 0.80)',
        '--vignette': 'rgba(1, 5, 2, 0.72)',
        '--hud': 'rgba(126, 224, 129, 0.32)',
        '--title-1': '#f4fbf5',
        '--title-2': '#7ee081',
        '--sub-ink': '#bedbc4',
        '--card-glow': 'rgba(126, 224, 129, 0.11)',
        '--overlay-bg': 'rgba(2, 7, 4, 0.82)',
        '--media-1': '#0d1f14',
        '--media-2': '#040a06',
        '--nb-frame': '#0e1e14'
      },
      canvas: {
        bg0: '#0d2215', bg1: '#06110a', bg2: '#020704',
        spot0: 'rgba(126, 224, 129, 0.12)', spot1: 'rgba(220, 195, 110, 0.05)',
        dust: 'rgba(195, 245, 205, 0.26)',
        ringOuter: 'rgba(126, 224, 129, 0.23)',
        ringInner: 'rgba(126, 224, 129, 0.11)',
        ringMeridian: 'rgba(180, 235, 190, 0.13)',
        art1: 'rgba(242, 184, 96,',
        art2: 'rgba(255, 118, 98,',
        art3: 'rgba(126, 224, 129,',
        artFillAlpha: 0.09,
        artStrokeAlpha: 0.98,
        labelStroke: 'rgba(5, 11, 7, 0.94)',
        geoBg0: '#0d2215', geoBg1: '#06110a', geoBg2: '#020704',
        geoSphereFill: 'rgba(126, 224, 129, 0.04)',
        geoSphereStroke: 'rgba(126, 224, 129, 0.30)',
        geoGrat: 'rgba(180, 235, 190, 0.10)',
        geoLandFill: 'rgba(24, 64, 38, 0.62)',
        geoLandStroke: 'rgba(126, 224, 129, 0.52)',
        geoHalo0: 'rgba(126, 224, 129, 0.28)',
        geoPin: '#7ee081',
        geoLabelInk: 'rgba(234, 246, 236, 0.96)',
        geoLabelSub: 'rgba(126, 224, 129, 0.92)',
        focusDim: 'rgba(2, 7, 4, 0.50)',
        switchFlash: 'rgba(5, 11, 7, 0.92)',
        linkHighlight: '#7ee081',
        cardShadow: 'rgba(1, 5, 2, 0.60)',
        cardShadowBig: 'rgba(1, 5, 2, 0.80)',
        cardPaper: ['#12261a', '#0a1810', '#060f0a'],
        cardInner: 'rgba(126, 224, 129, 0.25)',
        cardOuter: 'rgba(126, 224, 129, 0.46)',
        cardCode: 'rgba(188, 236, 196, 0.84)',
        dotRing: '#eaf6ec'
      },
      cats: {
        'Archaeopteryx': '#f2b860',
        'Pettirossi': '#ff7662',
        'Grilli': '#7ee081',
        'da classificare': '#b39ddb'
      }
    },
    light: {
      css: {
        '--bg': '#edf5ee',
        '--panel-top': 'rgba(250, 254, 250, 0.88)',
        '--panel-bot': 'rgba(234, 245, 236, 0.95)',
        '--glass-solid': 'rgba(248, 253, 249, 0.97)',
        '--ink': '#112416',
        '--mute': '#4b6b53',
        '--line': 'rgba(28, 108, 52, 0.16)',
        '--line-strong': 'rgba(28, 108, 52, 0.30)',
        '--specular': 'rgba(255, 255, 255, 0.85)',
        '--acc': '#247a3d',
        '--acc-2': '#195c2d',
        '--acc-ink': '#ffffff',
        '--chip-bg': 'rgba(28, 108, 52, 0.07)',
        '--chip-hover': 'rgba(28, 108, 52, 0.14)',
        '--shadow': 'rgba(14, 46, 24, 0.14)',
        '--vignette': 'rgba(170, 204, 178, 0.34)',
        '--hud': 'rgba(36, 122, 61, 0.34)',
        '--title-1': '#112416',
        '--title-2': '#247a3d',
        '--sub-ink': '#33543c',
        '--card-glow': 'rgba(36, 122, 61, 0.09)',
        '--overlay-bg': 'rgba(17, 36, 22, 0.54)',
        '--media-1': '#deede1',
        '--media-2': '#c8dfcd',
        '--nb-frame': '#deece1'
      },
      canvas: {
        bg0: '#f6fbf7', bg1: '#e8f3ea', bg2: '#d7e8da',
        spot0: 'rgba(36, 122, 61, 0.11)', spot1: 'rgba(130, 140, 60, 0.05)',
        dust: 'rgba(28, 108, 52, 0.22)',
        ringOuter: 'rgba(28, 108, 52, 0.24)',
        ringInner: 'rgba(28, 108, 52, 0.13)',
        ringMeridian: 'rgba(28, 108, 52, 0.15)',
        art1: 'rgba(182, 104, 28,',
        art2: 'rgba(196, 66, 52,',
        art3: 'rgba(36, 122, 61,',
        artFillAlpha: 0.08,
        artStrokeAlpha: 0.92,
        labelStroke: 'rgba(242, 250, 244, 0.94)',
        geoBg0: '#f5faf6', geoBg1: '#e6f2e8', geoBg2: '#d4e6d8',
        geoSphereFill: 'rgba(36, 122, 61, 0.04)',
        geoSphereStroke: 'rgba(28, 108, 52, 0.32)',
        geoGrat: 'rgba(28, 108, 52, 0.11)',
        geoLandFill: 'rgba(168, 204, 176, 0.65)',
        geoLandStroke: 'rgba(28, 108, 52, 0.52)',
        geoHalo0: 'rgba(36, 122, 61, 0.24)',
        geoPin: '#247a3d',
        geoLabelInk: 'rgba(17, 36, 22, 0.95)',
        geoLabelSub: 'rgba(36, 122, 61, 0.92)',
        focusDim: 'rgba(237, 245, 238, 0.55)',
        switchFlash: 'rgba(237, 245, 238, 0.92)',
        linkHighlight: '#247a3d',
        cardShadow: 'rgba(14, 46, 24, 0.20)',
        cardShadowBig: 'rgba(14, 46, 24, 0.34)',
        cardPaper: ['#ffffff', '#f1f8f2', '#e3efe5'],
        cardInner: 'rgba(28, 108, 52, 0.22)',
        cardOuter: 'rgba(28, 108, 52, 0.44)',
        cardCode: 'rgba(32, 86, 48, 0.84)',
        dotRing: '#112416'
      },
      cats: {
        'Archaeopteryx': '#c86d1f',
        'Pettirossi': '#d14334',
        'Grilli': '#247a3d',
        'da classificare': '#7a5fb8'
      }
    }
  },
  {
    id: 'amethyst',
    name: 'Ametista Siderale',
    subtitle: 'Velluto crepuscolare · Quarzo viola e rosa',
    swatches: ['#120a1c', '#c792ea', '#f4ecfa'],
    dark: {
      css: {
        '--bg': '#08050d',
        '--panel-top': 'rgba(24, 15, 36, 0.86)',
        '--panel-bot': 'rgba(11, 7, 18, 0.94)',
        '--glass-solid': 'rgba(14, 9, 22, 0.96)',
        '--ink': '#f5eefb',
        '--mute': '#b39ec7',
        '--line': 'rgba(199, 146, 234, 0.16)',
        '--line-strong': 'rgba(199, 146, 234, 0.32)',
        '--specular': 'rgba(240, 220, 255, 0.11)',
        '--acc': '#c792ea',
        '--acc-2': '#9d65c9',
        '--acc-ink': '#180924',
        '--chip-bg': 'rgba(199, 146, 234, 0.07)',
        '--chip-hover': 'rgba(199, 146, 234, 0.15)',
        '--shadow': 'rgba(3, 1, 8, 0.80)',
        '--vignette': 'rgba(3, 1, 7, 0.72)',
        '--hud': 'rgba(199, 146, 234, 0.32)',
        '--title-1': '#fbf7ff',
        '--title-2': '#c792ea',
        '--sub-ink': '#d8c5e8',
        '--card-glow': 'rgba(199, 146, 234, 0.11)',
        '--overlay-bg': 'rgba(4, 2, 10, 0.82)',
        '--media-1': '#1a1026',
        '--media-2': '#07040c',
        '--nb-frame': '#191124'
      },
      canvas: {
        bg0: '#1b1029', bg1: '#0c0714', bg2: '#040208',
        spot0: 'rgba(199, 146, 234, 0.13)', spot1: 'rgba(235, 130, 175, 0.05)',
        dust: 'rgba(232, 210, 250, 0.26)',
        ringOuter: 'rgba(199, 146, 234, 0.23)',
        ringInner: 'rgba(199, 146, 234, 0.11)',
        ringMeridian: 'rgba(220, 195, 245, 0.13)',
        art1: 'rgba(242, 176, 106,',
        art2: 'rgba(255, 118, 128,',
        art3: 'rgba(148, 224, 138,',
        artFillAlpha: 0.09,
        artStrokeAlpha: 0.98,
        labelStroke: 'rgba(8, 5, 13, 0.94)',
        geoBg0: '#1b1029', geoBg1: '#0c0714', geoBg2: '#040208',
        geoSphereFill: 'rgba(199, 146, 234, 0.04)',
        geoSphereStroke: 'rgba(199, 146, 234, 0.30)',
        geoGrat: 'rgba(220, 195, 245, 0.10)',
        geoLandFill: 'rgba(54, 34, 78, 0.62)',
        geoLandStroke: 'rgba(199, 146, 234, 0.52)',
        geoHalo0: 'rgba(199, 146, 234, 0.28)',
        geoPin: '#c792ea',
        geoLabelInk: 'rgba(245, 238, 251, 0.96)',
        geoLabelSub: 'rgba(199, 146, 234, 0.92)',
        focusDim: 'rgba(4, 2, 10, 0.50)',
        switchFlash: 'rgba(8, 5, 13, 0.92)',
        linkHighlight: '#c792ea',
        cardShadow: 'rgba(2, 1, 6, 0.60)',
        cardShadowBig: 'rgba(2, 1, 6, 0.80)',
        cardPaper: ['#221633', '#150d21', '#0d0715'],
        cardInner: 'rgba(199, 146, 234, 0.25)',
        cardOuter: 'rgba(199, 146, 234, 0.46)',
        cardCode: 'rgba(224, 200, 244, 0.84)',
        dotRing: '#f5eefb'
      },
      cats: {
        'Archaeopteryx': '#f2b06a',
        'Pettirossi': '#ff7680',
        'Grilli': '#94e08a',
        'da classificare': '#c792ea'
      }
    },
    light: {
      css: {
        '--bg': '#f4effa',
        '--panel-top': 'rgba(253, 250, 255, 0.88)',
        '--panel-bot': 'rgba(242, 235, 250, 0.95)',
        '--glass-solid': 'rgba(252, 249, 255, 0.97)',
        '--ink': '#1e122b',
        '--mute': '#624d78',
        '--line': 'rgba(112, 56, 158, 0.16)',
        '--line-strong': 'rgba(112, 56, 158, 0.30)',
        '--specular': 'rgba(255, 255, 255, 0.85)',
        '--acc': '#7a3eb3',
        '--acc-2': '#5d2b8c',
        '--acc-ink': '#ffffff',
        '--chip-bg': 'rgba(112, 56, 158, 0.07)',
        '--chip-hover': 'rgba(112, 56, 158, 0.14)',
        '--shadow': 'rgba(34, 16, 52, 0.14)',
        '--vignette': 'rgba(192, 174, 212, 0.34)',
        '--hud': 'rgba(122, 62, 179, 0.34)',
        '--title-1': '#1e122b',
        '--title-2': '#7a3eb3',
        '--sub-ink': '#49355e',
        '--card-glow': 'rgba(122, 62, 179, 0.09)',
        '--overlay-bg': 'rgba(30, 18, 43, 0.54)',
        '--media-1': '#eae0f5',
        '--media-2': '#d8c8eb',
        '--nb-frame': '#eae0f4'
      },
      canvas: {
        bg0: '#faf7fd', bg1: '#efe8f7', bg2: '#e2d6f0',
        spot0: 'rgba(122, 62, 179, 0.11)', spot1: 'rgba(180, 80, 140, 0.05)',
        dust: 'rgba(112, 56, 158, 0.22)',
        ringOuter: 'rgba(112, 56, 158, 0.24)',
        ringInner: 'rgba(112, 56, 158, 0.13)',
        ringMeridian: 'rgba(112, 56, 158, 0.15)',
        art1: 'rgba(182, 104, 28,',
        art2: 'rgba(196, 66, 62,',
        art3: 'rgba(64, 132, 54,',
        artFillAlpha: 0.08,
        artStrokeAlpha: 0.92,
        labelStroke: 'rgba(247, 242, 252, 0.94)',
        geoBg0: '#f9f6fc', geoBg1: '#ede5f6', geoBg2: '#dfd3ee',
        geoSphereFill: 'rgba(122, 62, 179, 0.04)',
        geoSphereStroke: 'rgba(112, 56, 158, 0.32)',
        geoGrat: 'rgba(112, 56, 158, 0.11)',
        geoLandFill: 'rgba(190, 170, 212, 0.65)',
        geoLandStroke: 'rgba(112, 56, 158, 0.52)',
        geoHalo0: 'rgba(122, 62, 179, 0.24)',
        geoPin: '#7a3eb3',
        geoLabelInk: 'rgba(30, 18, 43, 0.95)',
        geoLabelSub: 'rgba(122, 62, 179, 0.92)',
        focusDim: 'rgba(244, 239, 250, 0.55)',
        switchFlash: 'rgba(244, 239, 250, 0.92)',
        linkHighlight: '#7a3eb3',
        cardShadow: 'rgba(34, 16, 52, 0.20)',
        cardShadowBig: 'rgba(34, 16, 52, 0.34)',
        cardPaper: ['#ffffff', '#f6f1fc', '#ebe2f6'],
        cardInner: 'rgba(112, 56, 158, 0.22)',
        cardOuter: 'rgba(112, 56, 158, 0.44)',
        cardCode: 'rgba(78, 42, 114, 0.84)',
        dotRing: '#1e122b'
      },
      cats: {
        'Archaeopteryx': '#c86d1f',
        'Pettirossi': '#d14334',
        'Grilli': '#4e9636',
        'da classificare': '#7a3eb3'
      }
    }
  }
];

export const PALETTE_MAP = new Map(PALETTES.map(p => [p.id, p]));

const LS_PAL = 'atlante:palette:v1';
const LS_MODE = 'atlante:themeMode:v1';
const sysDark = matchMedia('(prefers-color-scheme: dark)');

const themeHooks = [];
let cardRebuilder = null;

export function registerThemeHook(fn) {
  themeHooks.push(fn);
}

export function registerCardRebuilder(fn) {
  cardRebuilder = fn;
}

export function getResolvedTheme() {
  if (state.themeMode === 'light' || state.themeMode === 'dark') return state.themeMode;
  return sysDark.matches ? 'dark' : 'light';
}

export function getThemeTokens() {
  const pal = PALETTE_MAP.get(state.palette) || PALETTES[1];
  const resolved = getResolvedTheme();
  return pal[resolved] || pal.dark;
}

export function syncCanvasTheme() {
  const tokens = getThemeTokens();
  const cats = Object.keys(state.col);
  cats.forEach((c, i) => {
    state.col[c] = (tokens.cats && tokens.cats[c]) || PAL[i % PAL.length];
  });
}

function applyAllTokens() {
  const resolved = getResolvedTheme();
  const tokens = getThemeTokens();
  const root = document.documentElement;
  root.dataset.palette = state.palette;
  root.dataset.theme = resolved;
  for (const [k, v] of Object.entries(tokens.css)) {
    root.style.setProperty(k, v);
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', tokens.css['--bg']);

  syncCanvasTheme();
  for (const fn of themeHooks) fn();
  if (cardRebuilder) cardRebuilder();
  markDirty();
  window.dispatchEvent(new CustomEvent('atlante:themechange', { detail: { palette: state.palette, theme: resolved } }));
}

export function applyPalette(id) {
  if (!PALETTE_MAP.has(id)) return;
  state.palette = id;
  try { localStorage.setItem(LS_PAL, id); } catch (_) {}
  applyAllTokens();
}

export function applyThemeMode(mode) {
  if (!['auto', 'light', 'dark'].includes(mode)) return;
  state.themeMode = mode;
  try { localStorage.setItem(LS_MODE, mode); } catch (_) {}
  applyAllTokens();
}

export function initThemeSystem() {
  try {
    const savedPal = localStorage.getItem(LS_PAL);
    const savedMode = localStorage.getItem(LS_MODE);
    if (savedPal && PALETTE_MAP.has(savedPal)) state.palette = savedPal;
    if (savedMode && ['auto', 'light', 'dark'].includes(savedMode)) state.themeMode = savedMode;
  } catch (_) {}
  sysDark.addEventListener('change', () => {
    if (state.themeMode === 'auto') applyAllTokens();
  });
  applyAllTokens();
}
