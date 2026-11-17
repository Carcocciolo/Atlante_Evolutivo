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
        '--bg': '#f4ece0',
        '--panel-top': 'rgba(255, 251, 245, 0.88)',
        '--panel-bot': 'rgba(245, 236, 223, 0.92)',
        '--glass-solid': 'rgba(253, 249, 242, 0.97)',
        '--ink': '#241409',
        '--mute': '#694d38',
        '--line': 'rgba(96, 56, 24, 0.16)',
        '--line-strong': 'rgba(96, 56, 24, 0.30)',
        '--specular': 'rgba(255, 255, 255, 0.88)',
        '--acc': '#b85c18',
        '--acc-2': '#98470d',
        '--acc-ink': '#fffaf4',
        '--chip-bg': 'rgba(120, 72, 32, 0.06)',
        '--chip-hover': 'rgba(120, 72, 32, 0.13)',
        '--shadow': 'rgba(48, 26, 10, 0.15)',
        '--vignette': 'rgba(196, 174, 144, 0.34)',
        '--hud': 'rgba(168, 88, 28, 0.34)',
        '--title-1': '#241409',
        '--title-2': '#9e4c12',
        '--sub-ink': '#5c412c',
        '--card-glow': 'rgba(184, 92, 24, 0.09)',
        '--overlay-bg': 'rgba(36, 20, 9, 0.44)',
        '--media-1': '#efe3d2',
        '--media-2': '#dfd0bb',
        '--nb-frame': '#fffcf7'
      },
      canvas: {
        bg0: '#fbf6ee', bg1: '#f0e4d3', bg2: '#e2d2ba',
        spot0: 'rgba(196, 110, 42, 0.11)', spot1: 'rgba(218, 165, 105, 0.04)',
        dust: 'rgba(130, 78, 36, 0.22)',
        ringOuter: 'rgba(168, 88, 28, 0.26)',
        ringInner: 'rgba(168, 88, 28, 0.13)',
        ringMeridian: 'rgba(120, 68, 28, 0.14)',
        art1: 'rgba(166, 84, 24,',
        art2: 'rgba(194, 62, 48,',
        art3: 'rgba(58, 130, 50,',
        artFillAlpha: 0.07,
        artStrokeAlpha: 0.95,
        labelStroke: 'rgba(251, 246, 238, 0.95)',
        geoBg0: '#faf4eb', geoBg1: '#efe3d2', geoBg2: '#e0cfb7',
        geoSphereFill: 'rgba(184, 92, 24, 0.03)',
        geoSphereStroke: 'rgba(156, 82, 26, 0.32)',
        geoGrat: 'rgba(120, 72, 32, 0.12)',
        geoLandFill: 'rgba(214, 192, 162, 0.74)',
        geoLandStroke: 'rgba(148, 78, 26, 0.58)',
        geoHalo0: 'rgba(184, 92, 24, 0.24)',
        geoPin: '#b85c18',
        geoLabelInk: 'rgba(36, 20, 9, 0.95)',
        geoLabelSub: 'rgba(156, 76, 18, 0.92)',
        focusDim: 'rgba(235, 222, 204, 0.52)',
        switchFlash: 'rgba(244, 236, 224, 0.92)',
        linkHighlight: '#b85c18',
        cardShadow: 'rgba(48, 26, 10, 0.22)',
        cardShadowBig: 'rgba(48, 26, 10, 0.34)',
        cardPaper: ['#ffffff', '#fbf5ec', '#efe3d1'],
        cardInner: 'rgba(72, 42, 18, 0.22)',
        cardOuter: 'rgba(168, 92, 34, 0.38)',
        cardCode: 'rgba(68, 38, 16, 0.80)',
        dotRing: '#241409'
      },
      cats: {
        'Archaeopteryx': '#c96a1b',
        'Pettirossi': '#d9483b',
        'Grilli': '#3f8f38',
        'da classificare': '#76658a'
      }
    }
  },

  {
    id: 'cyanotype',
    name: 'Abisso Bioluminescente',
    subtitle: 'Fossa oceanica · Ciano elettrico e cianotipia',
    swatches: ['#091d36', '#4ef2f5', '#edf4f8'],
    dark: {
      css: {
        '--bg': '#030912',
        '--panel-top': 'rgba(10, 26, 46, 0.85)',
        '--panel-bot': 'rgba(4, 12, 24, 0.92)',
        '--glass-solid': 'rgba(6, 16, 30, 0.96)',
        '--ink': '#e8f6fb',
        '--mute': '#9ab8ce',
        '--line': 'rgba(78, 242, 245, 0.16)',
        '--line-strong': 'rgba(78, 242, 245, 0.34)',
        '--specular': 'rgba(210, 246, 255, 0.11)',
        '--acc': '#4ef2f5',
        '--acc-2': '#26bfd4',
        '--acc-ink': '#031722',
        '--chip-bg': 'rgba(78, 242, 245, 0.07)',
        '--chip-hover': 'rgba(78, 242, 245, 0.15)',
        '--shadow': 'rgba(1, 5, 12, 0.78)',
        '--vignette': 'rgba(2, 6, 12, 0.70)',
        '--hud': 'rgba(78, 242, 245, 0.34)',
        '--title-1': '#f2fcff',
        '--title-2': '#76f2f5',
        '--sub-ink': '#c2e0ef',
        '--card-glow': 'rgba(78, 242, 245, 0.12)',
        '--overlay-bg': 'rgba(2, 7, 14, 0.80)',
        '--media-1': '#0a1c32',
        '--media-2': '#030811',
        '--nb-frame': '#0c1c30'
      },
      canvas: {
        bg0: '#0d2440', bg1: '#05101f', bg2: '#02060d',
        spot0: 'rgba(78, 242, 245, 0.14)', spot1: 'rgba(125, 195, 245, 0.05)',
        dust: 'rgba(195, 242, 255, 0.28)',
        ringOuter: 'rgba(78, 242, 245, 0.24)',
        ringInner: 'rgba(78, 242, 245, 0.12)',
        ringMeridian: 'rgba(148, 218, 246, 0.14)',
        art1: 'rgba(245, 174, 102,',
        art2: 'rgba(255, 118, 108,',
        art3: 'rgba(110, 231, 183,',
        artFillAlpha: 0.08,
        artStrokeAlpha: 0.98,
        labelStroke: 'rgba(3, 9, 18, 0.94)',
        geoBg0: '#0c213b', geoBg1: '#05101f', geoBg2: '#02060d',
        geoSphereFill: 'rgba(78, 242, 245, 0.04)',
        geoSphereStroke: 'rgba(78, 242, 245, 0.32)',
        geoGrat: 'rgba(148, 218, 246, 0.10)',
        geoLandFill: 'rgba(20, 56, 92, 0.60)',
        geoLandStroke: 'rgba(78, 242, 245, 0.54)',
        geoHalo0: 'rgba(78, 242, 245, 0.30)',
        geoPin: '#4ef2f5',
        geoLabelInk: 'rgba(232, 246, 251, 0.96)',
        geoLabelSub: 'rgba(78, 242, 245, 0.94)',
        focusDim: 'rgba(3, 8, 16, 0.48)',
        switchFlash: 'rgba(3, 9, 18, 0.92)',
        linkHighlight: '#4ef2f5',
        cardShadow: 'rgba(1, 5, 12, 0.56)',
        cardShadowBig: 'rgba(1, 5, 12, 0.76)',
        cardPaper: ['#10243d', '#091628', '#050d18'],
        cardInner: 'rgba(78, 242, 245, 0.28)',
        cardOuter: 'rgba(78, 242, 245, 0.52)',
        cardCode: 'rgba(186, 236, 252, 0.84)',
        dotRing: '#e8f6fb'
      },
      cats: {
        'Archaeopteryx': '#f5a962',
        'Pettirossi': '#ff7369',
        'Grilli': '#6ee7b7',
        'da classificare': '#a5b4fc'
      }
    },
    light: {
      css: {
        '--bg': '#ebf3f8',
        '--panel-top': 'rgba(250, 253, 255, 0.88)',
        '--panel-bot': 'rgba(236, 245, 251, 0.92)',
        '--glass-solid': 'rgba(248, 252, 255, 0.97)',
        '--ink': '#0b1d2e',
        '--mute': '#3f5d78',
        '--line': 'rgba(15, 68, 112, 0.15)',
        '--line-strong': 'rgba(15, 68, 112, 0.28)',
        '--specular': 'rgba(255, 255, 255, 0.92)',
        '--acc': '#0f568c',
        '--acc-2': '#0a416b',
        '--acc-ink': '#f4faff',
        '--chip-bg': 'rgba(15, 86, 140, 0.06)',
        '--chip-hover': 'rgba(15, 86, 140, 0.13)',
        '--shadow': 'rgba(12, 38, 64, 0.15)',
        '--vignette': 'rgba(168, 194, 214, 0.35)',
        '--hud': 'rgba(15, 86, 140, 0.32)',
        '--title-1': '#0b1d2e',
        '--title-2': '#1264a3',
        '--sub-ink': '#335069',
        '--card-glow': 'rgba(15, 86, 140, 0.08)',
        '--overlay-bg': 'rgba(11, 29, 46, 0.44)',
        '--media-1': '#e1edf5',
        '--media-2': '#cddde8',
        '--nb-frame': '#ffffff'
      },
      canvas: {
        bg0: '#f7fbfe', bg1: '#e6f0f7', bg2: '#d4e3ee',
        spot0: 'rgba(15, 102, 168, 0.10)', spot1: 'rgba(92, 168, 218, 0.04)',
        dust: 'rgba(24, 82, 130, 0.20)',
        ringOuter: 'rgba(15, 86, 140, 0.26)',
        ringInner: 'rgba(15, 86, 140, 0.13)',
        ringMeridian: 'rgba(28, 96, 148, 0.14)',
        art1: 'rgba(184, 92, 28,',
        art2: 'rgba(196, 58, 52,',
        art3: 'rgba(28, 128, 94,',
        artFillAlpha: 0.07,
        artStrokeAlpha: 0.95,
        labelStroke: 'rgba(247, 251, 254, 0.95)',
        geoBg0: '#f5fafe', geoBg1: '#e4eff7', geoBg2: '#d2e2ed',
        geoSphereFill: 'rgba(15, 86, 140, 0.03)',
        geoSphereStroke: 'rgba(15, 86, 140, 0.32)',
        geoGrat: 'rgba(24, 88, 138, 0.12)',
        geoLandFill: 'rgba(182, 208, 228, 0.74)',
        geoLandStroke: 'rgba(15, 86, 140, 0.58)',
        geoHalo0: 'rgba(15, 86, 140, 0.24)',
        geoPin: '#0f568c',
        geoLabelInk: 'rgba(11, 29, 46, 0.95)',
        geoLabelSub: 'rgba(15, 86, 140, 0.92)',
        focusDim: 'rgba(222, 235, 245, 0.52)',
        switchFlash: 'rgba(235, 243, 248, 0.92)',
        linkHighlight: '#0f568c',
        cardShadow: 'rgba(12, 38, 64, 0.22)',
        cardShadowBig: 'rgba(12, 38, 64, 0.34)',
        cardPaper: ['#ffffff', '#f5fafe', '#e7f1f8'],
        cardInner: 'rgba(15, 58, 94, 0.22)',
        cardOuter: 'rgba(15, 86, 140, 0.36)',
        cardCode: 'rgba(15, 58, 94, 0.80)',
        dotRing: '#0b1d2e'
      },
      cats: {
        'Archaeopteryx': '#c96424',
        'Pettirossi': '#cf463c',
        'Grilli': '#1f7a5c',
        'da classificare': '#5b6799'
      }
    }
  },

  {
    id: 'emerald',
    name: 'Erbario Smeraldo',
    subtitle: 'Serra vittoriana · Clorofilla e ottone',
    swatches: ['#0a2217', '#4ee09e', '#eff5f0'],
    dark: {
      css: {
        '--bg': '#030b08',
        '--panel-top': 'rgba(11, 32, 22, 0.85)',
        '--panel-bot': 'rgba(4, 15, 10, 0.92)',
        '--glass-solid': 'rgba(6, 19, 13, 0.96)',
        '--ink': '#e8f6ef',
        '--mute': '#9cc2b0',
        '--line': 'rgba(78, 224, 158, 0.16)',
        '--line-strong': 'rgba(78, 224, 158, 0.32)',
        '--specular': 'rgba(214, 250, 232, 0.10)',
        '--acc': '#4ee09e',
        '--acc-2': '#2cb87a',
        '--acc-ink': '#041e12',
        '--chip-bg': 'rgba(78, 224, 158, 0.07)',
        '--chip-hover': 'rgba(78, 224, 158, 0.14)',
        '--shadow': 'rgba(1, 8, 5, 0.78)',
        '--vignette': 'rgba(2, 7, 4, 0.70)',
        '--hud': 'rgba(78, 224, 158, 0.32)',
        '--title-1': '#f2fbf6',
        '--title-2': '#84e8bc',
        '--sub-ink': '#c3e3d3',
        '--card-glow': 'rgba(78, 224, 158, 0.11)',
        '--overlay-bg': 'rgba(2, 8, 5, 0.80)',
        '--media-1': '#0b2217',
        '--media-2': '#030a06',
        '--nb-frame': '#0d2017'
      },
      canvas: {
        bg0: '#0c2419', bg1: '#05120c', bg2: '#020704',
        spot0: 'rgba(78, 224, 158, 0.13)', spot1: 'rgba(164, 224, 180, 0.04)',
        dust: 'rgba(202, 245, 222, 0.26)',
        ringOuter: 'rgba(78, 224, 158, 0.23)',
        ringInner: 'rgba(78, 224, 158, 0.11)',
        ringMeridian: 'rgba(158, 226, 192, 0.13)',
        art1: 'rgba(232, 184, 90,',
        art2: 'rgba(244, 116, 98,',
        art3: 'rgba(94, 234, 180,',
        artFillAlpha: 0.08,
        artStrokeAlpha: 0.98,
        labelStroke: 'rgba(3, 11, 8, 0.94)',
        geoBg0: '#0b2217', geoBg1: '#05120c', geoBg2: '#020704',
        geoSphereFill: 'rgba(78, 224, 158, 0.04)',
        geoSphereStroke: 'rgba(78, 224, 158, 0.30)',
        geoGrat: 'rgba(158, 226, 192, 0.10)',
        geoLandFill: 'rgba(20, 62, 43, 0.60)',
        geoLandStroke: 'rgba(78, 224, 158, 0.52)',
        geoHalo0: 'rgba(78, 224, 158, 0.30)',
        geoPin: '#4ee09e',
        geoLabelInk: 'rgba(232, 246, 239, 0.96)',
        geoLabelSub: 'rgba(78, 224, 158, 0.94)',
        focusDim: 'rgba(3, 10, 7, 0.48)',
        switchFlash: 'rgba(3, 11, 8, 0.92)',
        linkHighlight: '#4ee09e',
        cardShadow: 'rgba(1, 8, 5, 0.56)',
        cardShadowBig: 'rgba(1, 8, 5, 0.76)',
        cardPaper: ['#10291e', '#091912', '#05100b'],
        cardInner: 'rgba(78, 224, 158, 0.28)',
        cardOuter: 'rgba(78, 224, 158, 0.50)',
        cardCode: 'rgba(190, 242, 216, 0.84)',
        dotRing: '#e8f6ef'
      },
      cats: {
        'Archaeopteryx': '#e8b85a',
        'Pettirossi': '#f47462',
        'Grilli': '#5eead4',
        'da classificare': '#a7b8d0'
      }
    },
    light: {
      css: {
        '--bg': '#edf4ef',
        '--panel-top': 'rgba(251, 254, 252, 0.88)',
        '--panel-bot': 'rgba(238, 246, 240, 0.92)',
        '--glass-solid': 'rgba(249, 253, 250, 0.97)',
        '--ink': '#0e241a',
        '--mute': '#3e6150',
        '--line': 'rgba(20, 82, 54, 0.15)',
        '--line-strong': 'rgba(20, 82, 54, 0.28)',
        '--specular': 'rgba(255, 255, 255, 0.92)',
        '--acc': '#186945',
        '--acc-2': '#115235',
        '--acc-ink': '#f4fcf7',
        '--chip-bg': 'rgba(24, 105, 69, 0.06)',
        '--chip-hover': 'rgba(24, 105, 69, 0.13)',
        '--shadow': 'rgba(12, 42, 28, 0.15)',
        '--vignette': 'rgba(172, 198, 180, 0.35)',
        '--hud': 'rgba(24, 105, 69, 0.32)',
        '--title-1': '#0e241a',
        '--title-2': '#1b7a50',
        '--sub-ink': '#345445',
        '--card-glow': 'rgba(24, 105, 69, 0.08)',
        '--overlay-bg': 'rgba(14, 36, 26, 0.44)',
        '--media-1': '#e2ede5',
        '--media-2': '#cfdfd3',
        '--nb-frame': '#ffffff'
      },
      canvas: {
        bg0: '#f7fcf9', bg1: '#e7f2ea', bg2: '#d5e4d9',
        spot0: 'rgba(24, 118, 76, 0.10)', spot1: 'rgba(104, 178, 140, 0.04)',
        dust: 'rgba(26, 94, 62, 0.20)',
        ringOuter: 'rgba(24, 105, 69, 0.26)',
        ringInner: 'rgba(24, 105, 69, 0.13)',
        ringMeridian: 'rgba(32, 112, 76, 0.14)',
        art1: 'rgba(176, 112, 24,',
        art2: 'rgba(196, 66, 52,',
        art3: 'rgba(24, 116, 76,',
        artFillAlpha: 0.07,
        artStrokeAlpha: 0.95,
        labelStroke: 'rgba(247, 252, 249, 0.95)',
        geoBg0: '#f5fbf7', geoBg1: '#e5f0e8', geoBg2: '#d3e3d7',
        geoSphereFill: 'rgba(24, 105, 69, 0.03)',
        geoSphereStroke: 'rgba(24, 105, 69, 0.32)',
        geoGrat: 'rgba(28, 104, 70, 0.12)',
        geoLandFill: 'rgba(184, 212, 194, 0.74)',
        geoLandStroke: 'rgba(24, 105, 69, 0.58)',
        geoHalo0: 'rgba(24, 105, 69, 0.24)',
        geoPin: '#186945',
        geoLabelInk: 'rgba(14, 36, 26, 0.95)',
        geoLabelSub: 'rgba(24, 105, 69, 0.92)',
        focusDim: 'rgba(224, 238, 228, 0.52)',
        switchFlash: 'rgba(237, 244, 239, 0.92)',
        linkHighlight: '#186945',
        cardShadow: 'rgba(12, 42, 28, 0.22)',
        cardShadowBig: 'rgba(12, 42, 28, 0.34)',
        cardPaper: ['#ffffff', '#f5fbf7', '#e8f3ec'],
        cardInner: 'rgba(18, 68, 46, 0.22)',
        cardOuter: 'rgba(24, 105, 69, 0.36)',
        cardCode: 'rgba(18, 68, 46, 0.80)',
        dotRing: '#0e241a'
      },
      cats: {
        'Archaeopteryx': '#b87619',
        'Pettirossi': '#c94a38',
        'Grilli': '#1b7a50',
        'da classificare': '#5e6e82'
      }
    }
  },

  {
    id: 'monolith',
    name: 'Prisma Platino',
    subtitle: 'Architettura cinetica · Ottone e grafite',
    swatches: ['#14161b', '#e5c58e', '#f4f4f2'],
    dark: {
      css: {
        '--bg': '#07080a',
        '--panel-top': 'rgba(22, 24, 30, 0.85)',
        '--panel-bot': 'rgba(10, 11, 15, 0.92)',
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
        '--overlay-bg': 'rgba(4, 5, 8, 0.80)',
        '--media-1': '#16181e',
        '--media-2': '#060709',
        '--nb-frame': '#181a20'
      },
      canvas: {
        bg0: '#17191f', bg1: '#0b0c10', bg2: '#040507',
        spot0: 'rgba(229, 197, 142, 0.11)', spot1: 'rgba(210, 216, 228, 0.04)',
        dust: 'rgba(232, 235, 242, 0.24)',
        ringOuter: 'rgba(229, 197, 142, 0.22)',
        ringInner: 'rgba(229, 197, 142, 0.11)',
        ringMeridian: 'rgba(226, 230, 238, 0.13)',
        art1: 'rgba(229, 197, 142,',
        art2: 'rgba(239, 107, 91,',
        art3: 'rgba(125, 211, 168,',
        artFillAlpha: 0.07,
        artStrokeAlpha: 0.96,
        labelStroke: 'rgba(7, 8, 10, 0.94)',
        geoBg0: '#15171d', geoBg1: '#0b0c10', geoBg2: '#040507',
        geoSphereFill: 'rgba(229, 197, 142, 0.035)',
        geoSphereStroke: 'rgba(229, 197, 142, 0.28)',
        geoGrat: 'rgba(226, 230, 238, 0.09)',
        geoLandFill: 'rgba(44, 48, 58, 0.62)',
        geoLandStroke: 'rgba(229, 197, 142, 0.50)',
        geoHalo0: 'rgba(229, 197, 142, 0.28)',
        geoPin: '#e5c58e',
        geoLabelInk: 'rgba(244, 245, 247, 0.96)',
        geoLabelSub: 'rgba(229, 197, 142, 0.94)',
        focusDim: 'rgba(5, 6, 9, 0.48)',
        switchFlash: 'rgba(7, 8, 10, 0.92)',
        linkHighlight: '#e5c58e',
        cardShadow: 'rgba(0, 0, 0, 0.58)',
        cardShadowBig: 'rgba(0, 0, 0, 0.78)',
        cardPaper: ['#20232b', '#13151a', '#0c0d11'],
        cardInner: 'rgba(229, 197, 142, 0.25)',
        cardOuter: 'rgba(229, 197, 142, 0.48)',
        cardCode: 'rgba(230, 233, 240, 0.82)',
        dotRing: '#f4f5f7'
      },
      cats: {
        'Archaeopteryx': '#e5c58e',
        'Pettirossi': '#ef6b5b',
        'Grilli': '#7dd3a8',
        'da classificare': '#9ca3af'
      }
    },
    light: {
      css: {
        '--bg': '#f2f2ef',
        '--panel-top': 'rgba(255, 255, 254, 0.88)',
        '--panel-bot': 'rgba(243, 243, 240, 0.92)',
        '--glass-solid': 'rgba(253, 253, 252, 0.97)',
        '--ink': '#14161a',
        '--mute': '#525762',
        '--line': 'rgba(24, 28, 36, 0.14)',
        '--line-strong': 'rgba(24, 28, 36, 0.26)',
        '--specular': 'rgba(255, 255, 255, 0.92)',
        '--acc': '#8f6224',
        '--acc-2': '#704b18',
        '--acc-ink': '#ffffff',
        '--chip-bg': 'rgba(24, 28, 36, 0.05)',
        '--chip-hover': 'rgba(24, 28, 36, 0.11)',
        '--shadow': 'rgba(16, 18, 24, 0.14)',
        '--vignette': 'rgba(195, 195, 188, 0.32)',
        '--hud': 'rgba(143, 98, 36, 0.30)',
        '--title-1': '#14161a',
        '--title-2': '#5c492e',
        '--sub-ink': '#464b54',
        '--card-glow': 'rgba(143, 98, 36, 0.07)',
        '--overlay-bg': 'rgba(20, 22, 26, 0.44)',
        '--media-1': '#eaeae6',
        '--media-2': '#dadad4',
        '--nb-frame': '#ffffff'
      },
      canvas: {
        bg0: '#fcfcfa', bg1: '#edede9', bg2: '#deded8',
        spot0: 'rgba(143, 98, 36, 0.09)', spot1: 'rgba(160, 164, 172, 0.04)',
        dust: 'rgba(60, 64, 72, 0.18)',
        ringOuter: 'rgba(143, 98, 36, 0.24)',
        ringInner: 'rgba(143, 98, 36, 0.12)',
        ringMeridian: 'rgba(64, 68, 76, 0.13)',
        art1: 'rgba(154, 102, 32,',
        art2: 'rgba(194, 62, 48,',
        art3: 'rgba(42, 118, 82,',
        artFillAlpha: 0.06,
        artStrokeAlpha: 0.92,
        labelStroke: 'rgba(252, 252, 250, 0.95)',
        geoBg0: '#fafaf8', geoBg1: '#ebebe6', geoBg2: '#dcdcd5',
        geoSphereFill: 'rgba(143, 98, 36, 0.025)',
        geoSphereStroke: 'rgba(120, 86, 38, 0.30)',
        geoGrat: 'rgba(64, 68, 76, 0.11)',
        geoLandFill: 'rgba(206, 206, 200, 0.74)',
        geoLandStroke: 'rgba(110, 82, 42, 0.54)',
        geoHalo0: 'rgba(143, 98, 36, 0.22)',
        geoPin: '#8f6224',
        geoLabelInk: 'rgba(20, 22, 26, 0.95)',
        geoLabelSub: 'rgba(143, 98, 36, 0.92)',
        focusDim: 'rgba(232, 232, 228, 0.52)',
        switchFlash: 'rgba(242, 242, 239, 0.92)',
        linkHighlight: '#8f6224',
        cardShadow: 'rgba(16, 18, 24, 0.20)',
        cardShadowBig: 'rgba(16, 18, 24, 0.32)',
        cardPaper: ['#ffffff', '#f8f8f6', '#ecece8'],
        cardInner: 'rgba(32, 34, 40, 0.20)',
        cardOuter: 'rgba(143, 98, 36, 0.34)',
        cardCode: 'rgba(32, 34, 40, 0.80)',
        dotRing: '#14161a'
      },
      cats: {
        'Archaeopteryx': '#a66d1e',
        'Pettirossi': '#c94436',
        'Grilli': '#2c7a56',
        'da classificare': '#6b7280'
      }
    }
  },

  {
    id: 'amethyst',
    name: 'Wunderkammer',
    subtitle: 'Cosmo barocco · Quarzo rosa e ametista',
    swatches: ['#1a0e30', '#f0a3c0', '#f5eff8'],
    dark: {
      css: {
        '--bg': '#070410',
        '--panel-top': 'rgba(26, 14, 48, 0.85)',
        '--panel-bot': 'rgba(10, 6, 22, 0.92)',
        '--glass-solid': 'rgba(13, 8, 26, 0.96)',
        '--ink': '#f7f0fa',
        '--mute': '#bfa9cf',
        '--line': 'rgba(240, 163, 192, 0.16)',
        '--line-strong': 'rgba(240, 163, 192, 0.32)',
        '--specular': 'rgba(245, 224, 255, 0.11)',
        '--acc': '#f0a3c0',
        '--acc-2': '#d17b9d',
        '--acc-ink': '#260b18',
        '--chip-bg': 'rgba(240, 163, 192, 0.07)',
        '--chip-hover': 'rgba(240, 163, 192, 0.14)',
        '--shadow': 'rgba(3, 1, 8, 0.78)',
        '--vignette': 'rgba(4, 2, 10, 0.70)',
        '--hud': 'rgba(240, 163, 192, 0.32)',
        '--title-1': '#fdf7ff',
        '--title-2': '#f3b7ce',
        '--sub-ink': '#decce8',
        '--card-glow': 'rgba(240, 163, 192, 0.12)',
        '--overlay-bg': 'rgba(5, 2, 12, 0.80)',
        '--media-1': '#180d2c',
        '--media-2': '#05020b',
        '--nb-frame': '#1a102e'
      },
      canvas: {
        bg0: '#1b0f33', bg1: '#0b0619', bg2: '#030108',
        spot0: 'rgba(240, 163, 192, 0.13)', spot1: 'rgba(182, 144, 242, 0.05)',
        dust: 'rgba(240, 214, 252, 0.27)',
        ringOuter: 'rgba(240, 163, 192, 0.23)',
        ringInner: 'rgba(240, 163, 192, 0.11)',
        ringMeridian: 'rgba(222, 184, 242, 0.14)',
        art1: 'rgba(242, 173, 107,',
        art2: 'rgba(255, 117, 143,',
        art3: 'rgba(123, 224, 181,',
        artFillAlpha: 0.08,
        artStrokeAlpha: 0.98,
        labelStroke: 'rgba(7, 4, 16, 0.94)',
        geoBg0: '#190e30', geoBg1: '#0b0619', geoBg2: '#030108',
        geoSphereFill: 'rgba(240, 163, 192, 0.04)',
        geoSphereStroke: 'rgba(240, 163, 192, 0.30)',
        geoGrat: 'rgba(222, 184, 242, 0.10)',
        geoLandFill: 'rgba(52, 30, 88, 0.60)',
        geoLandStroke: 'rgba(240, 163, 192, 0.52)',
        geoHalo0: 'rgba(240, 163, 192, 0.30)',
        geoPin: '#f0a3c0',
        geoLabelInk: 'rgba(247, 240, 250, 0.96)',
        geoLabelSub: 'rgba(240, 163, 192, 0.94)',
        focusDim: 'rgba(6, 3, 14, 0.48)',
        switchFlash: 'rgba(7, 4, 16, 0.92)',
        linkHighlight: '#f0a3c0',
        cardShadow: 'rgba(3, 1, 8, 0.56)',
        cardShadowBig: 'rgba(3, 1, 8, 0.76)',
        cardPaper: ['#24153d', '#150c26', '#0d0717'],
        cardInner: 'rgba(240, 163, 192, 0.28)',
        cardOuter: 'rgba(240, 163, 192, 0.50)',
        cardCode: 'rgba(238, 214, 250, 0.84)',
        dotRing: '#f7f0fa'
      },
      cats: {
        'Archaeopteryx': '#f2ad6b',
        'Pettirossi': '#ff758f',
        'Grilli': '#7be0b5',
        'da classificare': '#c49bff'
      }
    },
    light: {
      css: {
        '--bg': '#f3edf7',
        '--panel-top': 'rgba(253, 250, 255, 0.88)',
        '--panel-bot': 'rgba(243, 235, 248, 0.92)',
        '--glass-solid': 'rgba(252, 248, 254, 0.97)',
        '--ink': '#1e1026',
        '--mute': '#5c416b',
        '--line': 'rgba(84, 42, 108, 0.15)',
        '--line-strong': 'rgba(84, 42, 108, 0.28)',
        '--specular': 'rgba(255, 255, 255, 0.92)',
        '--acc': '#7a3578',
        '--acc-2': '#5e245c',
        '--acc-ink': '#fdf7ff',
        '--chip-bg': 'rgba(122, 53, 120, 0.06)',
        '--chip-hover': 'rgba(122, 53, 120, 0.13)',
        '--shadow': 'rgba(32, 14, 44, 0.15)',
        '--vignette': 'rgba(196, 178, 208, 0.35)',
        '--hud': 'rgba(122, 53, 120, 0.32)',
        '--title-1': '#1e1026',
        '--title-2': '#7a3578',
        '--sub-ink': '#4e355c',
        '--card-glow': 'rgba(122, 53, 120, 0.08)',
        '--overlay-bg': 'rgba(30, 16, 38, 0.44)',
        '--media-1': '#ebe1f2',
        '--media-2': '#dacbe6',
        '--nb-frame': '#ffffff'
      },
      canvas: {
        bg0: '#fbf7fd', bg1: '#ede2f4', bg2: '#dfd0ea',
        spot0: 'rgba(138, 62, 134, 0.10)', spot1: 'rgba(176, 126, 204, 0.04)',
        dust: 'rgba(92, 46, 114, 0.20)',
        ringOuter: 'rgba(122, 53, 120, 0.26)',
        ringInner: 'rgba(122, 53, 120, 0.13)',
        ringMeridian: 'rgba(104, 52, 124, 0.14)',
        art1: 'rgba(176, 96, 28,',
        art2: 'rgba(192, 52, 84,',
        art3: 'rgba(38, 122, 86,',
        artFillAlpha: 0.07,
        artStrokeAlpha: 0.95,
        labelStroke: 'rgba(251, 247, 253, 0.95)',
        geoBg0: '#faf5fc', geoBg1: '#ece0f3', geoBg2: '#ddcee8',
        geoSphereFill: 'rgba(122, 53, 120, 0.03)',
        geoSphereStroke: 'rgba(122, 53, 120, 0.32)',
        geoGrat: 'rgba(96, 48, 118, 0.12)',
        geoLandFill: 'rgba(208, 190, 220, 0.74)',
        geoLandStroke: 'rgba(122, 53, 120, 0.58)',
        geoHalo0: 'rgba(122, 53, 120, 0.24)',
        geoPin: '#7a3578',
        geoLabelInk: 'rgba(30, 16, 38, 0.95)',
        geoLabelSub: 'rgba(122, 53, 120, 0.92)',
        focusDim: 'rgba(234, 224, 242, 0.52)',
        switchFlash: 'rgba(243, 237, 247, 0.92)',
        linkHighlight: '#7a3578',
        cardShadow: 'rgba(32, 14, 44, 0.22)',
        cardShadowBig: 'rgba(32, 14, 44, 0.34)',
        cardPaper: ['#ffffff', '#faf5fc', '#efe4f5'],
        cardInner: 'rgba(54, 26, 72, 0.22)',
        cardOuter: 'rgba(122, 53, 120, 0.36)',
        cardCode: 'rgba(54, 26, 72, 0.80)',
        dotRing: '#1e1026'
      },
      cats: {
        'Archaeopteryx': '#b56522',
        'Pettirossi': '#c43b5a',
        'Grilli': '#2c7d59',
        'da classificare': '#7a4999'
      }
    }
  }
];

export const PALETTE_MAP = new Map(PALETTES.map(p => [p.id, p]));

const sysDarkMQ = matchMedia('(prefers-color-scheme: dark)');
const themeHooks = new Set();
let cardRebuilder = null;

export function registerThemeHook(fn) {
  themeHooks.add(fn);
}

export function registerCardRebuilder(fn) {
  cardRebuilder = fn;
}

export function getResolvedTheme() {
  if (state.themeMode === 'light' || state.themeMode === 'dark') {
    return state.themeMode;
  }
  return sysDarkMQ.matches ? 'dark' : 'light';
}

export function getThemeTokens() {
  const pal = PALETTE_MAP.get(state.palette) || PALETTES[0];
  const mode = getResolvedTheme();
  return pal[mode];
}

export function applyCategoryColors() {
  const tokens = getThemeTokens();
  const cats = Object.keys(state.col);
  if (!cats.length) return;
  cats.forEach((c, i) => {
    state.col[c] = tokens.cats[c] || PAL[i % PAL.length];
  });
}

export function applyTheme(rebuildCards = true) {
  const pal = PALETTE_MAP.get(state.palette) || PALETTES[0];
  const resolved = getResolvedTheme();
  const tokens = pal[resolved];
  const root = document.documentElement;

  root.dataset.palette = pal.id;
  root.dataset.theme = resolved;
  root.style.colorScheme = resolved;

  for (const [k, v] of Object.entries(tokens.css)) {
    root.style.setProperty(k, v);
  }

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta && tokens.css['--bg']) {
    meta.setAttribute('content', tokens.css['--bg']);
  }

  applyCategoryColors();

  for (const fn of themeHooks) {
    try { fn(resolved, pal, tokens); } catch (_) {}
  }

  if (rebuildCards && typeof cardRebuilder === 'function') {
    cardRebuilder();
  }

  markDirty();
}

export function setThemeMode(mode) {
  if (!['auto', 'light', 'dark'].includes(mode)) return;
  state.themeMode = mode;
  applyTheme(true);
}

export function setPalette(paletteId) {
  if (!PALETTE_MAP.has(paletteId)) return;
  state.palette = paletteId;
  applyTheme(true);
}

export function cyclePalette() {
  const idx = PALETTES.findIndex(p => p.id === state.palette);
  const next = PALETTES[(idx + 1) % PALETTES.length];
  setPalette(next.id);
  return next;
}

export function cycleThemeMode() {
  const order = ['auto', 'light', 'dark'];
  const next = order[(order.indexOf(state.themeMode) + 1) % order.length];
  setThemeMode(next);
  return next;
}

let initialized = false;
export function initTheme() {
  if (!initialized) {
    initialized = true;
    const onSysChange = () => {
      if (state.themeMode === 'auto') {
        applyTheme(true);
      }
    };
    if (typeof sysDarkMQ.addEventListener === 'function') {
      sysDarkMQ.addEventListener('change', onSysChange);
    } else if (typeof sysDarkMQ.addListener === 'function') {
      sysDarkMQ.addListener(onSysChange);
    }
  }
  applyTheme(false);
}
