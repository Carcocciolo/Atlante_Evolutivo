/* ============================================================
   theme.js — motore cromatico multi-palette e gestione
   automatica tema chiaro / scuro di sistema
   ============================================================ */
import { state, PAL, markDirty } from './data.js';

export const PALETTES = [
  {
    id: 'amber',
    name: 'Ambra Fossile',
    subtitle: 'Gabinetto naturalistico · Oro antico',
    swatches: ['#220f06', '#f2a65a', '#f5ede1'],
    dark: {
      css: {
        '--bg': '#0b0402',
        '--panel-top': 'rgba(34, 14, 7, 0.86)',
        '--panel-bot': 'rgba(13, 5, 2, 0.92)',
        '--glass-solid': 'rgba(15, 6, 2, 0.96)',
        '--ink': '#fbeee0',
        '--mute': '#cdb097',
        '--line': 'rgba(255, 214, 170, 0.14)',
        '--line-strong': 'rgba(255, 214, 170, 0.28)',
        '--specular': 'rgba(255, 232, 204, 0.09)',
        '--acc': '#f2a65a',
        '--acc-2': '#e38c42',
        '--acc-ink': '#2a1206',
        '--chip-bg': 'rgba(255, 226, 190, 0.06)',
        '--chip-hover': 'rgba(255, 226, 190, 0.12)',
        '--shadow': 'rgba(0, 0, 0, 0.72)',
        '--vignette': 'rgba(4, 1, 0, 0.68)',
        '--hud': 'rgba(242, 166, 90, 0.28)',
        '--title-1': '#fff5e8',
        '--title-2': '#f5be82',
        '--sub-ink': '#f3d8bf',
        '--card-glow': 'rgba(242, 166, 90, 0.10)',
        '--overlay-bg': 'rgba(6, 2, 1, 0.78)',
        '--media-1': '#1d0c05',
        '--media-2': '#060201',
        '--nb-frame': '#f4efe3'
      },
      canvas: {
        bg0: '#220f06', bg1: '#0d0502', bg2: '#040100',
        spot0: 'rgba(242, 166, 90, 0.12)', spot1: 'rgba(232, 195, 130, 0.04)',
        dust: 'rgba(255, 224, 185, 0.24)',
        ringOuter: 'rgba(242, 166, 90, 0.20)',
        ringInner: 'rgba(242, 166, 90, 0.10)',
        ringMeridian: 'rgba(255, 214, 170, 0.11)',
        art1: 'rgba(242, 166, 90,',
        art2: 'rgba(255, 128, 112,',
        art3: 'rgba(140, 217, 107,',
        artFillAlpha: 0.09,
        artStrokeAlpha: 1.0,
        labelStroke: 'rgba(11, 4, 2, 0.92)',
        geoBg0: '#200e06', geoBg1: '#0d0502', geoBg2: '#040100',
        geoSphereFill: 'rgba(242, 166, 90, 0.035)',
        geoSphereStroke: 'rgba(242, 166, 90, 0.28)',
        geoGrat: 'rgba(255, 214, 170, 0.09)',
        geoLandFill: 'rgba(72, 34, 16, 0.56)',
        geoLandStroke: 'rgba(242, 166, 90, 0.52)',
        geoHalo0: 'rgba(242, 166, 90, 0.28)',
        geoPin: '#f2a65a',
        geoLabelInk: 'rgba(251, 238, 224, 0.96)',
        geoLabelSub: 'rgba(242, 166, 90, 0.92)',
        focusDim: 'rgba(8, 3, 1, 0.44)',
        switchFlash: 'rgba(11, 4, 2, 0.92)',
        linkHighlight: '#f2a65a',
        cardShadow: 'rgba(6, 2, 1, 0.48)',
        cardShadowBig: 'rgba(6, 2, 1, 0.68)',
        cardPaper: ['#fbf6ed', '#f5ede0', '#ebe0cf'],
        cardInner: 'rgba(42, 18, 6, 0.22)',
        cardOuter: 'rgba(242, 166, 90, 0.35)',
        cardCode: 'rgba(62, 32, 14, 0.72)',
        dotRing: '#f4efe3'
      },
      cats: {
        'Archaeopteryx': '#f2a65a',
        'Pettirossi': '#ff6b57',
        'Grilli': '#8cd96b',
        'da classificare': '#a799b7'
      }
    },
    light: {
      css: {
        '--bg': '#f4ece0',
        '--panel-top': 'rgba(255, 251, 245, 0.86)',
        '--panel-bot': 'rgba(245, 236, 223, 0.90)',
        '--glass-solid': 'rgba(253, 249, 242, 0.96)',
        '--ink': '#241409',
        '--mute': '#694d38',
        '--line': 'rgba(96, 56, 24, 0.14)',
        '--line-strong': 'rgba(96, 56, 24, 0.26)',
        '--specular': 'rgba(255, 255, 255, 0.85)',
        '--acc': '#b85c18',
        '--acc-2': '#98470d',
        '--acc-ink': '#fffaf4',
        '--chip-bg': 'rgba(120, 72, 32, 0.06)',
        '--chip-hover': 'rgba(120, 72, 32, 0.12)',
        '--shadow': 'rgba(48, 26, 10, 0.14)',
        '--vignette': 'rgba(196, 174, 144, 0.34)',
        '--hud': 'rgba(168, 88, 28, 0.30)',
        '--title-1': '#241409',
        '--title-2': '#9e4c12',
        '--sub-ink': '#5c412c',
        '--card-glow': 'rgba(184, 92, 24, 0.08)',
        '--overlay-bg': 'rgba(36, 20, 9, 0.42)',
        '--media-1': '#efe3d2',
        '--media-2': '#dfd0bb',
        '--nb-frame': '#fffcf7'
      },
      canvas: {
        bg0: '#fbf6ee', bg1: '#f0e4d3', bg2: '#e2d2ba',
        spot0: 'rgba(196, 110, 42, 0.10)', spot1: 'rgba(218, 165, 105, 0.04)',
        dust: 'rgba(130, 78, 36, 0.20)',
        ringOuter: 'rgba(168, 88, 28, 0.24)',
        ringInner: 'rgba(168, 88, 28, 0.12)',
        ringMeridian: 'rgba(120, 68, 28, 0.12)',
        art1: 'rgba(166, 84, 24,',
        art2: 'rgba(194, 62, 48,',
        art3: 'rgba(58, 130, 50,',
        artFillAlpha: 0.07,
        artStrokeAlpha: 0.95,
        labelStroke: 'rgba(251, 246, 238, 0.94)',
        geoBg0: '#faf4eb', geoBg1: '#efe3d2', geoBg2: '#e0cfb7',
        geoSphereFill: 'rgba(184, 92, 24, 0.03)',
        geoSphereStroke: 'rgba(156, 82, 26, 0.30)',
        geoGrat: 'rgba(120, 72, 32, 0.11)',
        geoLandFill: 'rgba(214, 192, 162, 0.72)',
        geoLandStroke: 'rgba(148, 78, 26, 0.55)',
        geoHalo0: 'rgba(184, 92, 24, 0.22)',
        geoPin: '#b85c18',
        geoLabelInk: 'rgba(36, 20, 9, 0.95)',
        geoLabelSub: 'rgba(156, 76, 18, 0.92)',
        focusDim: 'rgba(235, 222, 204, 0.52)',
        switchFlash: 'rgba(244, 236, 224, 0.92)',
        linkHighlight: '#b85c18',
        cardShadow: 'rgba(48, 26, 10, 0.20)',
        cardShadowBig: 'rgba(48, 26, 10, 0.32)',
        cardPaper: ['#ffffff', '#fcf8f2', '#f2e8d9'],
        cardInner: 'rgba(72, 42, 18, 0.20)',
        cardOuter: 'rgba(168, 92, 34, 0.34)',
        cardCode: 'rgba(68, 38, 16, 0.78)',
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
    name: 'Cianotipia',
    subtitle: 'Blu di Prussia · Tavole solari',
    swatches: ['#0c2038', '#5ce1e6', '#edf4f8'],
    dark: {
      css: {
        '--bg': '#040b14',
        '--panel-top': 'rgba(11, 28, 48, 0.86)',
        '--panel-bot': 'rgba(5, 14, 26, 0.92)',
        '--glass-solid': 'rgba(7, 18, 33, 0.96)',
        '--ink': '#e8f5fa',
        '--mute': '#9bb8cc',
        '--line': 'rgba(148, 212, 242, 0.15)',
        '--line-strong': 'rgba(148, 212, 242, 0.30)',
        '--specular': 'rgba(210, 242, 255, 0.10)',
        '--acc': '#5ce1e6',
        '--acc-2': '#34b8cf',
        '--acc-ink': '#041824',
        '--chip-bg': 'rgba(148, 212, 242, 0.07)',
        '--chip-hover': 'rgba(148, 212, 242, 0.14)',
        '--shadow': 'rgba(1, 5, 12, 0.74)',
        '--vignette': 'rgba(2, 6, 12, 0.68)',
        '--hud': 'rgba(92, 225, 230, 0.28)',
        '--title-1': '#f2fbff',
        '--title-2': '#7ee8ed',
        '--sub-ink': '#c2deed',
        '--card-glow': 'rgba(92, 225, 230, 0.10)',
        '--overlay-bg': 'rgba(2, 7, 14, 0.78)',
        '--media-1': '#0b1e34',
        '--media-2': '#030912',
        '--nb-frame': '#eef6fa'
      },
      canvas: {
        bg0: '#0e2540', bg1: '#061221', bg2: '#02070e',
        spot0: 'rgba(92, 225, 230, 0.12)', spot1: 'rgba(125, 195, 245, 0.04)',
        dust: 'rgba(195, 236, 255, 0.24)',
        ringOuter: 'rgba(92, 225, 230, 0.22)',
        ringInner: 'rgba(92, 225, 230, 0.11)',
        ringMeridian: 'rgba(148, 212, 242, 0.12)',
        art1: 'rgba(245, 174, 102,',
        art2: 'rgba(255, 118, 108,',
        art3: 'rgba(110, 231, 183,',
        artFillAlpha: 0.08,
        artStrokeAlpha: 0.98,
        labelStroke: 'rgba(4, 11, 20, 0.92)',
        geoBg0: '#0d223b', geoBg1: '#061221', geoBg2: '#02070e',
        geoSphereFill: 'rgba(92, 225, 230, 0.035)',
        geoSphereStroke: 'rgba(92, 225, 230, 0.28)',
        geoGrat: 'rgba(148, 212, 242, 0.10)',
        geoLandFill: 'rgba(22, 58, 94, 0.58)',
        geoLandStroke: 'rgba(92, 225, 230, 0.50)',
        geoHalo0: 'rgba(92, 225, 230, 0.28)',
        geoPin: '#5ce1e6',
        geoLabelInk: 'rgba(232, 245, 250, 0.96)',
        geoLabelSub: 'rgba(92, 225, 230, 0.92)',
        focusDim: 'rgba(3, 9, 18, 0.45)',
        switchFlash: 'rgba(4, 11, 20, 0.92)',
        linkHighlight: '#5ce1e6',
        cardShadow: 'rgba(1, 5, 12, 0.50)',
        cardShadowBig: 'rgba(1, 5, 12, 0.70)',
        cardPaper: ['#f4f9fc', '#e9f2f7', '#dce8f0'],
        cardInner: 'rgba(12, 36, 62, 0.22)',
        cardOuter: 'rgba(92, 225, 230, 0.36)',
        cardCode: 'rgba(16, 46, 76, 0.75)',
        dotRing: '#e8f5fa'
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
        '--panel-top': 'rgba(250, 253, 255, 0.86)',
        '--panel-bot': 'rgba(236, 245, 251, 0.90)',
        '--glass-solid': 'rgba(248, 252, 255, 0.96)',
        '--ink': '#0b1d2e',
        '--mute': '#3f5d78',
        '--line': 'rgba(15, 68, 112, 0.14)',
        '--line-strong': 'rgba(15, 68, 112, 0.26)',
        '--specular': 'rgba(255, 255, 255, 0.90)',
        '--acc': '#0f568c',
        '--acc-2': '#0a416b',
        '--acc-ink': '#f4faff',
        '--chip-bg': 'rgba(15, 86, 140, 0.06)',
        '--chip-hover': 'rgba(15, 86, 140, 0.12)',
        '--shadow': 'rgba(12, 38, 64, 0.14)',
        '--vignette': 'rgba(168, 194, 214, 0.35)',
        '--hud': 'rgba(15, 86, 140, 0.28)',
        '--title-1': '#0b1d2e',
        '--title-2': '#1264a3',
        '--sub-ink': '#335069',
        '--card-glow': 'rgba(15, 86, 140, 0.08)',
        '--overlay-bg': 'rgba(11, 29, 46, 0.42)',
        '--media-1': '#e1edf5',
        '--media-2': '#cddde8',
        '--nb-frame': '#ffffff'
      },
      canvas: {
        bg0: '#f7fbfe', bg1: '#e6f0f7', bg2: '#d4e3ee',
        spot0: 'rgba(15, 102, 168, 0.09)', spot1: 'rgba(92, 168, 218, 0.04)',
        dust: 'rgba(24, 82, 130, 0.18)',
        ringOuter: 'rgba(15, 86, 140, 0.24)',
        ringInner: 'rgba(15, 86, 140, 0.12)',
        ringMeridian: 'rgba(28, 96, 148, 0.12)',
        art1: 'rgba(184, 92, 28,',
        art2: 'rgba(196, 58, 52,',
        art3: 'rgba(28, 128, 94,',
        artFillAlpha: 0.07,
        artStrokeAlpha: 0.95,
        labelStroke: 'rgba(247, 251, 254, 0.94)',
        geoBg0: '#f5fafe', geoBg1: '#e4eff7', geoBg2: '#d2e2ed',
        geoSphereFill: 'rgba(15, 86, 140, 0.03)',
        geoSphereStroke: 'rgba(15, 86, 140, 0.30)',
        geoGrat: 'rgba(24, 88, 138, 0.11)',
        geoLandFill: 'rgba(182, 208, 228, 0.72)',
        geoLandStroke: 'rgba(15, 86, 140, 0.55)',
        geoHalo0: 'rgba(15, 86, 140, 0.22)',
        geoPin: '#0f568c',
        geoLabelInk: 'rgba(11, 29, 46, 0.95)',
        geoLabelSub: 'rgba(15, 86, 140, 0.92)',
        focusDim: 'rgba(222, 235, 245, 0.52)',
        switchFlash: 'rgba(235, 243, 248, 0.92)',
        linkHighlight: '#0f568c',
        cardShadow: 'rgba(12, 38, 64, 0.20)',
        cardShadowBig: 'rgba(12, 38, 64, 0.32)',
        cardPaper: ['#ffffff', '#f7fbfe', '#eaf2f8'],
        cardInner: 'rgba(15, 58, 94, 0.20)',
        cardOuter: 'rgba(15, 86, 140, 0.32)',
        cardCode: 'rgba(15, 58, 94, 0.78)',
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
    name: 'Smeraldo Erbario',
    subtitle: 'Serra vittoriana · Foglia e ottone',
    swatches: ['#0c2419', '#52d69c', '#eff5f0'],
    dark: {
      css: {
        '--bg': '#040d09',
        '--panel-top': 'rgba(12, 34, 24, 0.86)',
        '--panel-bot': 'rgba(5, 16, 11, 0.92)',
        '--glass-solid': 'rgba(7, 21, 15, 0.96)',
        '--ink': '#e8f5ee',
        '--mute': '#9ec2b0',
        '--line': 'rgba(158, 226, 192, 0.14)',
        '--line-strong': 'rgba(158, 226, 192, 0.28)',
        '--specular': 'rgba(214, 250, 232, 0.09)',
        '--acc': '#52d69c',
        '--acc-2': '#32b37c',
        '--acc-ink': '#052114',
        '--chip-bg': 'rgba(158, 226, 192, 0.06)',
        '--chip-hover': 'rgba(158, 226, 192, 0.13)',
        '--shadow': 'rgba(1, 8, 5, 0.74)',
        '--vignette': 'rgba(2, 7, 4, 0.68)',
        '--hud': 'rgba(82, 214, 156, 0.28)',
        '--title-1': '#f2fbf6',
        '--title-2': '#84e8bc',
        '--sub-ink': '#c3e3d3',
        '--card-glow': 'rgba(82, 214, 156, 0.10)',
        '--overlay-bg': 'rgba(2, 8, 5, 0.78)',
        '--media-1': '#0c2419',
        '--media-2': '#030b07',
        '--nb-frame': '#f0f7f3'
      },
      canvas: {
        bg0: '#0d261b', bg1: '#06140e', bg2: '#020805',
        spot0: 'rgba(82, 214, 156, 0.11)', spot1: 'rgba(164, 224, 180, 0.04)',
        dust: 'rgba(202, 245, 222, 0.23)',
        ringOuter: 'rgba(82, 214, 156, 0.21)',
        ringInner: 'rgba(82, 214, 156, 0.10)',
        ringMeridian: 'rgba(158, 226, 192, 0.11)',
        art1: 'rgba(232, 184, 90,',
        art2: 'rgba(244, 116, 98,',
        art3: 'rgba(94, 234, 180,',
        artFillAlpha: 0.08,
        artStrokeAlpha: 0.98,
        labelStroke: 'rgba(4, 13, 9, 0.92)',
        geoBg0: '#0c2419', geoBg1: '#06140e', geoBg2: '#020805',
        geoSphereFill: 'rgba(82, 214, 156, 0.035)',
        geoSphereStroke: 'rgba(82, 214, 156, 0.28)',
        geoGrat: 'rgba(158, 226, 192, 0.09)',
        geoLandFill: 'rgba(22, 66, 46, 0.58)',
        geoLandStroke: 'rgba(82, 214, 156, 0.50)',
        geoHalo0: 'rgba(82, 214, 156, 0.28)',
        geoPin: '#52d69c',
        geoLabelInk: 'rgba(232, 245, 238, 0.96)',
        geoLabelSub: 'rgba(82, 214, 156, 0.92)',
        focusDim: 'rgba(3, 10, 7, 0.45)',
        switchFlash: 'rgba(4, 13, 9, 0.92)',
        linkHighlight: '#52d69c',
        cardShadow: 'rgba(1, 8, 5, 0.50)',
        cardShadowBig: 'rgba(1, 8, 5, 0.70)',
        cardPaper: ['#f4faf6', '#eaf3ee', '#dde9e2'],
        cardInner: 'rgba(14, 48, 32, 0.22)',
        cardOuter: 'rgba(82, 214, 156, 0.35)',
        cardCode: 'rgba(18, 58, 40, 0.75)',
        dotRing: '#e8f5ee'
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
        '--panel-top': 'rgba(251, 254, 252, 0.86)',
        '--panel-bot': 'rgba(238, 246, 240, 0.90)',
        '--glass-solid': 'rgba(249, 253, 250, 0.96)',
        '--ink': '#0e241a',
        '--mute': '#3e6150',
        '--line': 'rgba(20, 82, 54, 0.14)',
        '--line-strong': 'rgba(20, 82, 54, 0.26)',
        '--specular': 'rgba(255, 255, 255, 0.90)',
        '--acc': '#186945',
        '--acc-2': '#115235',
        '--acc-ink': '#f4fcf7',
        '--chip-bg': 'rgba(24, 105, 69, 0.06)',
        '--chip-hover': 'rgba(24, 105, 69, 0.12)',
        '--shadow': 'rgba(12, 42, 28, 0.14)',
        '--vignette': 'rgba(172, 198, 180, 0.35)',
        '--hud': 'rgba(24, 105, 69, 0.28)',
        '--title-1': '#0e241a',
        '--title-2': '#1b7a50',
        '--sub-ink': '#345445',
        '--card-glow': 'rgba(24, 105, 69, 0.08)',
        '--overlay-bg': 'rgba(14, 36, 26, 0.42)',
        '--media-1': '#e2ede5',
        '--media-2': '#cfdfd3',
        '--nb-frame': '#ffffff'
      },
      canvas: {
        bg0: '#f7fcf9', bg1: '#e7f2ea', bg2: '#d5e4d9',
        spot0: 'rgba(24, 118, 76, 0.09)', spot1: 'rgba(104, 178, 140, 0.04)',
        dust: 'rgba(26, 94, 62, 0.18)',
        ringOuter: 'rgba(24, 105, 69, 0.24)',
        ringInner: 'rgba(24, 105, 69, 0.12)',
        ringMeridian: 'rgba(32, 112, 76, 0.12)',
        art1: 'rgba(176, 112, 24,',
        art2: 'rgba(196, 66, 52,',
        art3: 'rgba(24, 116, 76,',
        artFillAlpha: 0.07,
        artStrokeAlpha: 0.95,
        labelStroke: 'rgba(247, 252, 249, 0.94)',
        geoBg0: '#f5fbf7', geoBg1: '#e5f0e8', geoBg2: '#d3e3d7',
        geoSphereFill: 'rgba(24, 105, 69, 0.03)',
        geoSphereStroke: 'rgba(24, 105, 69, 0.30)',
        geoGrat: 'rgba(28, 104, 70, 0.11)',
        geoLandFill: 'rgba(184, 212, 194, 0.72)',
        geoLandStroke: 'rgba(24, 105, 69, 0.55)',
        geoHalo0: 'rgba(24, 105, 69, 0.22)',
        geoPin: '#186945',
        geoLabelInk: 'rgba(14, 36, 26, 0.95)',
        geoLabelSub: 'rgba(24, 105, 69, 0.92)',
        focusDim: 'rgba(224, 238, 228, 0.52)',
        switchFlash: 'rgba(237, 244, 239, 0.92)',
        linkHighlight: '#186945',
        cardShadow: 'rgba(12, 42, 28, 0.20)',
        cardShadowBig: 'rgba(12, 42, 28, 0.32)',
        cardPaper: ['#ffffff', '#f7fcf9', '#ebf4ee'],
        cardInner: 'rgba(18, 68, 46, 0.20)',
        cardOuter: 'rgba(24, 105, 69, 0.32)',
        cardCode: 'rgba(18, 68, 46, 0.78)',
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
    name: 'Galleria Platino',
    subtitle: 'Architettura minimal · Ottone e grafite',
    swatches: ['#16181d', '#dfc08e', '#f4f4f2'],
    dark: {
      css: {
        '--bg': '#08090c',
        '--panel-top': 'rgba(24, 26, 32, 0.86)',
        '--panel-bot': 'rgba(12, 13, 17, 0.92)',
        '--glass-solid': 'rgba(14, 16, 20, 0.96)',
        '--ink': '#f3f4f6',
        '--mute': '#a6abb6',
        '--line': 'rgba(226, 230, 238, 0.13)',
        '--line-strong': 'rgba(226, 230, 238, 0.25)',
        '--specular': 'rgba(255, 255, 255, 0.09)',
        '--acc': '#dfc08e',
        '--acc-2': '#c4a26b',
        '--acc-ink': '#1a150c',
        '--chip-bg': 'rgba(255, 255, 255, 0.06)',
        '--chip-hover': 'rgba(255, 255, 255, 0.12)',
        '--shadow': 'rgba(0, 0, 0, 0.76)',
        '--vignette': 'rgba(3, 4, 6, 0.68)',
        '--hud': 'rgba(223, 192, 142, 0.26)',
        '--title-1': '#ffffff',
        '--title-2': '#d8dce3',
        '--sub-ink': '#cfd4de',
        '--card-glow': 'rgba(223, 192, 142, 0.08)',
        '--overlay-bg': 'rgba(4, 5, 8, 0.78)',
        '--media-1': '#181a20',
        '--media-2': '#07080a',
        '--nb-frame': '#f5f5f3'
      },
      canvas: {
        bg0: '#181a20', bg1: '#0c0d11', bg2: '#040507',
        spot0: 'rgba(223, 192, 142, 0.10)', spot1: 'rgba(210, 216, 228, 0.04)',
        dust: 'rgba(232, 235, 242, 0.20)',
        ringOuter: 'rgba(223, 192, 142, 0.20)',
        ringInner: 'rgba(223, 192, 142, 0.10)',
        ringMeridian: 'rgba(226, 230, 238, 0.11)',
        art1: 'rgba(223, 192, 142,',
        art2: 'rgba(239, 107, 91,',
        art3: 'rgba(125, 211, 168,',
        artFillAlpha: 0.07,
        artStrokeAlpha: 0.95,
        labelStroke: 'rgba(8, 9, 12, 0.92)',
        geoBg0: '#16181e', geoBg1: '#0c0d11', geoBg2: '#040507',
        geoSphereFill: 'rgba(223, 192, 142, 0.03)',
        geoSphereStroke: 'rgba(223, 192, 142, 0.26)',
        geoGrat: 'rgba(226, 230, 238, 0.08)',
        geoLandFill: 'rgba(44, 48, 58, 0.60)',
        geoLandStroke: 'rgba(223, 192, 142, 0.46)',
        geoHalo0: 'rgba(223, 192, 142, 0.25)',
        geoPin: '#dfc08e',
        geoLabelInk: 'rgba(243, 244, 246, 0.96)',
        geoLabelSub: 'rgba(223, 192, 142, 0.92)',
        focusDim: 'rgba(5, 6, 9, 0.46)',
        switchFlash: 'rgba(8, 9, 12, 0.92)',
        linkHighlight: '#dfc08e',
        cardShadow: 'rgba(0, 0, 0, 0.52)',
        cardShadowBig: 'rgba(0, 0, 0, 0.72)',
        cardPaper: ['#fafafa', '#f2f2f0', '#e6e6e3'],
        cardInner: 'rgba(24, 26, 32, 0.22)',
        cardOuter: 'rgba(223, 192, 142, 0.34)',
        cardCode: 'rgba(32, 34, 40, 0.75)',
        dotRing: '#f3f4f6'
      },
      cats: {
        'Archaeopteryx': '#dfc08e',
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
        '--line': 'rgba(24, 28, 36, 0.12)',
        '--line-strong': 'rgba(24, 28, 36, 0.24)',
        '--specular': 'rgba(255, 255, 255, 0.92)',
        '--acc': '#8f6224',
        '--acc-2': '#704b18',
        '--acc-ink': '#ffffff',
        '--chip-bg': 'rgba(24, 28, 36, 0.05)',
        '--chip-hover': 'rgba(24, 28, 36, 0.10)',
        '--shadow': 'rgba(16, 18, 24, 0.12)',
        '--vignette': 'rgba(195, 195, 188, 0.32)',
        '--hud': 'rgba(143, 98, 36, 0.28)',
        '--title-1': '#14161a',
        '--title-2': '#5c492e',
        '--sub-ink': '#464b54',
        '--card-glow': 'rgba(143, 98, 36, 0.06)',
        '--overlay-bg': 'rgba(20, 22, 26, 0.42)',
        '--media-1': '#eaeae6',
        '--media-2': '#dadad4',
        '--nb-frame': '#ffffff'
      },
      canvas: {
        bg0: '#fcfcfa', bg1: '#ededE9', bg2: '#deded8',
        spot0: 'rgba(143, 98, 36, 0.08)', spot1: 'rgba(160, 164, 172, 0.04)',
        dust: 'rgba(60, 64, 72, 0.16)',
        ringOuter: 'rgba(143, 98, 36, 0.22)',
        ringInner: 'rgba(143, 98, 36, 0.11)',
        ringMeridian: 'rgba(64, 68, 76, 0.11)',
        art1: 'rgba(154, 102, 32,',
        art2: 'rgba(194, 62, 48,',
        art3: 'rgba(42, 118, 82,',
        artFillAlpha: 0.06,
        artStrokeAlpha: 0.92,
        labelStroke: 'rgba(252, 252, 250, 0.95)',
        geoBg0: '#fafaf8', geoBg1: '#ebebE6', geoBg2: '#dcdcd5',
        geoSphereFill: 'rgba(143, 98, 36, 0.025)',
        geoSphereStroke: 'rgba(120, 86, 38, 0.28)',
        geoGrat: 'rgba(64, 68, 76, 0.10)',
        geoLandFill: 'rgba(206, 206, 200, 0.72)',
        geoLandStroke: 'rgba(110, 82, 42, 0.50)',
        geoHalo0: 'rgba(143, 98, 36, 0.20)',
        geoPin: '#8f6224',
        geoLabelInk: 'rgba(20, 22, 26, 0.95)',
        geoLabelSub: 'rgba(143, 98, 36, 0.92)',
        focusDim: 'rgba(232, 232, 228, 0.52)',
        switchFlash: 'rgba(242, 242, 239, 0.92)',
        linkHighlight: '#8f6224',
        cardShadow: 'rgba(16, 18, 24, 0.18)',
        cardShadowBig: 'rgba(16, 18, 24, 0.30)',
        cardPaper: ['#ffffff', '#f9f9f7', '#eeeeeb'],
        cardInner: 'rgba(32, 34, 40, 0.18)',
        cardOuter: 'rgba(143, 98, 36, 0.30)',
        cardCode: 'rgba(32, 34, 40, 0.78)',
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
    subtitle: 'Crepuscolo barocco · Ametista e oro rosa',
    swatches: ['#1c1033', '#e89eb8', '#f5eff8'],
    dark: {
      css: {
        '--bg': '#090512',
        '--panel-top': 'rgba(28, 16, 51, 0.86)',
        '--panel-bot': 'rgba(12, 7, 24, 0.92)',
        '--glass-solid': 'rgba(15, 9, 29, 0.96)',
        '--ink': '#f6eff9',
        '--mute': '#bfa9cf',
        '--line': 'rgba(222, 184, 242, 0.15)',
        '--line-strong': 'rgba(222, 184, 242, 0.28)',
        '--specular': 'rgba(245, 224, 255, 0.10)',
        '--acc': '#e89eb8',
        '--acc-2': '#cc7898',
        '--acc-ink': '#260b18',
        '--chip-bg': 'rgba(222, 184, 242, 0.07)',
        '--chip-hover': 'rgba(222, 184, 242, 0.13)',
        '--shadow': 'rgba(3, 1, 8, 0.76)',
        '--vignette': 'rgba(4, 2, 10, 0.68)',
        '--hud': 'rgba(232, 158, 184, 0.28)',
        '--title-1': '#fdf7ff',
        '--title-2': '#edb4ca',
        '--sub-ink': '#decce8',
        '--card-glow': 'rgba(232, 158, 184, 0.10)',
        '--overlay-bg': 'rgba(5, 2, 12, 0.78)',
        '--media-1': '#1a0f30',
        '--media-2': '#06030d',
        '--nb-frame': '#f7f2fa'
      },
      canvas: {
        bg0: '#1d1136', bg1: '#0d071c', bg2: '#04020a',
        spot0: 'rgba(232, 158, 184, 0.12)', spot1: 'rgba(182, 144, 242, 0.05)',
        dust: 'rgba(240, 214, 252, 0.24)',
        ringOuter: 'rgba(232, 158, 184, 0.21)',
        ringInner: 'rgba(232, 158, 184, 0.10)',
        ringMeridian: 'rgba(222, 184, 242, 0.12)',
        art1: 'rgba(242, 173, 107,',
        art2: 'rgba(255, 117, 143,',
        art3: 'rgba(123, 224, 181,',
        artFillAlpha: 0.08,
        artStrokeAlpha: 0.98,
        labelStroke: 'rgba(9, 5, 18, 0.92)',
        geoBg0: '#1b1033', geoBg1: '#0d071c', geoBg2: '#04020a',
        geoSphereFill: 'rgba(232, 158, 184, 0.035)',
        geoSphereStroke: 'rgba(232, 158, 184, 0.28)',
        geoGrat: 'rgba(222, 184, 242, 0.09)',
        geoLandFill: 'rgba(54, 32, 92, 0.58)',
        geoLandStroke: 'rgba(232, 158, 184, 0.50)',
        geoHalo0: 'rgba(232, 158, 184, 0.28)',
        geoPin: '#e89eb8',
        geoLabelInk: 'rgba(246, 239, 249, 0.96)',
        geoLabelSub: 'rgba(232, 158, 184, 0.92)',
        focusDim: 'rgba(6, 3, 14, 0.45)',
        switchFlash: 'rgba(9, 5, 18, 0.92)',
        linkHighlight: '#e89eb8',
        cardShadow: 'rgba(3, 1, 8, 0.52)',
        cardShadowBig: 'rgba(3, 1, 8, 0.72)',
        cardPaper: ['#faf5fc', '#f2e9f6', '#e6dbed'],
        cardInner: 'rgba(38, 18, 62, 0.22)',
        cardOuter: 'rgba(232, 158, 184, 0.36)',
        cardCode: 'rgba(48, 24, 76, 0.75)',
        dotRing: '#f6eff9'
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
        '--panel-top': 'rgba(253, 250, 255, 0.86)',
        '--panel-bot': 'rgba(243, 235, 248, 0.90)',
        '--glass-solid': 'rgba(252, 248, 254, 0.96)',
        '--ink': '#1e1026',
        '--mute': '#5c416b',
        '--line': 'rgba(84, 42, 108, 0.14)',
        '--line-strong': 'rgba(84, 42, 108, 0.26)',
        '--specular': 'rgba(255, 255, 255, 0.90)',
        '--acc': '#7a3578',
        '--acc-2': '#5e245c',
        '--acc-ink': '#fdf7ff',
        '--chip-bg': 'rgba(122, 53, 120, 0.06)',
        '--chip-hover': 'rgba(122, 53, 120, 0.12)',
        '--shadow': 'rgba(32, 14, 44, 0.14)',
        '--vignette': 'rgba(196, 178, 208, 0.35)',
        '--hud': 'rgba(122, 53, 120, 0.28)',
        '--title-1': '#1e1026',
        '--title-2': '#7a3578',
        '--sub-ink': '#4e355c',
        '--card-glow': 'rgba(122, 53, 120, 0.08)',
        '--overlay-bg': 'rgba(30, 16, 38, 0.42)',
        '--media-1': '#ebe1f2',
        '--media-2': '#dacbe6',
        '--nb-frame': '#ffffff'
      },
      canvas: {
        bg0: '#fbf7fd', bg1: '#ede2f4', bg2: '#dfd0ea',
        spot0: 'rgba(138, 62, 134, 0.09)', spot1: 'rgba(176, 126, 204, 0.04)',
        dust: 'rgba(92, 46, 114, 0.18)',
        ringOuter: 'rgba(122, 53, 120, 0.24)',
        ringInner: 'rgba(122, 53, 120, 0.12)',
        ringMeridian: 'rgba(104, 52, 124, 0.12)',
        art1: 'rgba(176, 96, 28,',
        art2: 'rgba(192, 52, 84,',
        art3: 'rgba(38, 122, 86,',
        artFillAlpha: 0.07,
        artStrokeAlpha: 0.95,
        labelStroke: 'rgba(251, 247, 253, 0.94)',
        geoBg0: '#faf5fc', geoBg1: '#ece0f3', geoBg2: '#ddcee8',
        geoSphereFill: 'rgba(122, 53, 120, 0.03)',
        geoSphereStroke: 'rgba(122, 53, 120, 0.30)',
        geoGrat: 'rgba(96, 48, 118, 0.11)',
        geoLandFill: 'rgba(208, 190, 220, 0.72)',
        geoLandStroke: 'rgba(122, 53, 120, 0.55)',
        geoHalo0: 'rgba(122, 53, 120, 0.22)',
        geoPin: '#7a3578',
        geoLabelInk: 'rgba(30, 16, 38, 0.95)',
        geoLabelSub: 'rgba(122, 53, 120, 0.92)',
        focusDim: 'rgba(234, 224, 242, 0.52)',
        switchFlash: 'rgba(243, 237, 247, 0.92)',
        linkHighlight: '#7a3578',
        cardShadow: 'rgba(32, 14, 44, 0.20)',
        cardShadowBig: 'rgba(32, 14, 44, 0.32)',
        cardPaper: ['#ffffff', '#fbf7fd', '#f0e7f5'],
        cardInner: 'rgba(54, 26, 72, 0.20)',
        cardOuter: 'rgba(122, 53, 120, 0.32)',
        cardCode: 'rgba(54, 26, 72, 0.78)',
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
