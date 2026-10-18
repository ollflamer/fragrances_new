# Assets

`logo.png` and `favicon.png` were supplied in the original `img/` directory.

`hero-bg.jpg`, `citrus.webp`, `floral.webp` and `woody.webp` are illustrative AI-generated editorial images made with the built-in imagegen tool. They are not photographs of the company's actual products. All seeded products are marked as demonstrations.

Hero prompt: Photorealistic cinematic laboratory still life; clear reagent bottles and flask with amber fragrance oils, glass pipette, bergamot and dried botanicals on graphite stone. Midnight navy negative space on the left, warm directional light from the right. No text, labels, people or logos.

Product prompts: Square photorealistic editorial still life, one unlabelled laboratory bottle on pale warm stone with generous breathing room and warm directional sunlight. Citrus: amber concentrate, cut bergamot, curling peel and green leaf. Floral: pale golden concentrate, white jasmine flowers and green stems. Woody: dark amber concentrate, cedar slivers and amber resin. No text, labels, people or logos.

Replace these images with approved product photography before publishing. You can add further files here and upload product images through `/admin`.

## Saved paths

- `images/hero-bg.jpg`
- `images/citrus.webp`
- `images/floral.webp`
- `images/woody.webp`

The built-in imagegen tool generated the source rasters; the website copies were resized and encoded as JPEG / WebP with Sharp.

## Final generation prompts

### Hero

Use case: product-mockup. Asset type: full-width hero background for a premium industrial fragrance ingredients supplier website. Create a photorealistic cinematic editorial still life, landscape 1536x1024. On the RIGHT TWO THIRDS of the frame: three large clear laboratory glass reagent bottles and an Erlenmeyer flask with rich golden amber fragrance oils, a glass dropper above one vessel holding a tiny drop, fine subtle dried botanical stems and bergamot peel on a graphite stone laboratory surface. Background is sophisticated midnight navy blue, near #0b2034, faintly illuminated blue in upper right. Directional warm afternoon light from right beautifully refracts through amber liquid creating caustics, very refined real product photography with tactile glass. The LEFT THIRD is mostly empty deep navy negative space for white website text. Low contrast dark background, luminous golden bottles, balanced beautiful arrangement, no humans, absolutely no text, no letters, no logos, no labels, no watermark. Main bottle should look like a substantial chemistry glass reagent bottle, not cosmetic retail packaging.

### Product template

Use case: product-mockup. Asset type: square website product catalog photo for a premium industrial fragrance raw materials supplier. Photorealistic sophisticated editorial studio still life of {subject}. Composition: isolated single unlabelled bottle centered at slightly right on a matte pale warm stone #f0eeea backdrop and tabletop, entire bottle visible with generous breathing room for square website crop. Beautiful late afternoon directional sunlight from upper left casts long refined soft shadows, warm sunlight glows through glass, subtle realistic caustics. Quiet luxury chemistry, tactile organic details, elegant authentic physical materials, sharp focus on bottle, tasteful arrangement. No text, no label, no lettering, no logos, no hands, no humans, no watermark. Do not include any website interface.

`{subject}` values used in three separate calls:

- Citrus: a transparent clear cylindrical laboratory specimen vial with gold amber fragrance concentrate, a fresh cut bergamot half and elegantly curling citrus peel and dark green leaf
- Floral: a clear rectangular laboratory glass reagent bottle with pale golden fragrance concentrate, delicate white jasmine flowers and a few green stems
- Woody: a clear heavy round apothecary laboratory glass bottle with dark amber fragrance concentrate, cedar wood slivers and a small piece of amber resin
