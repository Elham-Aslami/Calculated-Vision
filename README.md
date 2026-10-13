# Calculated Visions — GitHub Pages website

This is the complete, editable website for the Portable Personal Cooling Shelter. It includes the original STL, Three.js, product images, source PDFs, styles, and scripts. No build step, npm installation, API key, or paid hosting service is required to publish this static website on GitHub Pages.

## Publish on GitHub Pages

1. Extract `Calculated-Visions-GitHub-Pages.zip` on your computer.
2. Open the extracted `calculated-visions` folder. You should see `index.html`, `styles.css`, `assets`, and `vendor` directly inside it.
3. On GitHub, create a repository named `calculated-visions`. Choose **Public** for the simplest GitHub Free setup. You may initialize it with a README to make the upload controls easy to find.
4. Open the repository and select **Add file → Upload files**. For an empty repository, use the **uploading an existing file** link instead.
5. Drag **everything inside** the extracted `calculated-visions` folder into the upload area, including the `assets`, `vendor`, and `scripts` folders. Commit the changes to `main`.
6. Open **Settings → Pages**. Under **Build and deployment**, choose **Deploy from a branch**. Select branch **main**, folder **/ (root)**, then **Save**.
7. Wait for deployment to finish. Return to Settings → Pages and use **Visit site** or the published link shown there.

Your usual project-site address is `https://YOUR-USERNAME.github.io/calculated-visions/`. Use the actual address GitHub gives you.

**Upload the extracted files, not the ZIP.** `index.html` must be at the top level of the repository. Do not upload the enclosing `calculated-visions` folder as an extra nested folder. Keep the internal `assets`, `vendor`, and `scripts` folders intact.

The included `.nojekyll` file tells GitHub to serve the static files without Jekyll processing. This package contains fewer than 100 files, and every individual file is well below GitHub's browser-upload size limit.

The GitHub Pages version uses relative asset paths, so it works under a repository path such as `/calculated-visions/` as well as at a domain root. It has no login requirement of its own.

## Check before your pitch

- Open the published page on the actual presentation computer.
- Click **Explore in 3D**, wait for **LIVE CAD MODEL**, then try drag, zoom, presets, feature labels, and fullscreen.
- On a phone, tap to interact with the model, then choose **Done exploring** to scroll normally.
- Open the FAQ and prepare a sample demo inquiry.
- Use `presenting.html` for the walkthrough and static backup link.

The form is a demonstration: it validates entries and lets visitors download a text inquiry. It does not email or submit anything to the team. GitHub Pages serves static files; a real inquiry destination must be connected separately.

Source, STL integrity, camera framing, feature-marker visibility, and inquiry validation checks passed. Interactive browser testing was unavailable in the build environment; rehearse on the presentation device.

## Run offline

After extracting the ZIP, double-click `run-windows.cmd` on Windows if Python or Node.js is installed. Alternatively, open a terminal in this folder and run one command:

- Windows/Python: `py -m http.server 8080 --bind 127.0.0.1 --directory .`
- macOS/Linux/Python: `python3 -m http.server 8080 --bind 127.0.0.1 --directory .`
- Node.js: `node server.mjs`

Open `http://localhost:8080` and keep the terminal open. All runtime assets are included, so this local copy works without internet. Use a local server; double-clicking `index.html` can prevent browser modules and the 3D model from loading.

## Edit the website

| File | Purpose |
| --- | --- |
| `index.html` | Product copy, specifications, pricing, team, inquiry form, and metadata |
| `styles.css` | Colors, typography, responsive layouts, and accessibility styles |
| `content.js` | Feature descriptions, marker positions, and industry use cases |
| `app.js` | Navigation, tabs, inquiry interactions, and viewer startup |
| `viewer.js` | 3D model loading, materials, lighting, rotation, zoom, presets, and fallback |
| `viewer-math.js` | Camera framing that preserves the original model proportions |
| `inquiry.js` | Demo inquiry validation and text export |
| `presenting.html` | Presentation walkthrough and offline instructions |
| `assets/tent.stl` | Original supplied STL, unchanged |
| `assets/model-parts.json` | Per-face coloring for the shelter and exterior AC region |
| `assets/*.webp` | Concept images extracted from the supplied presentation |
| `assets/*.pdf` | Current design plan and team presentation |
| `assets/team/` | Contributor portraits; names and display framing are in `index.html` and `styles.css` |
| `vendor/` | Self-hosted Three.js and required helpers |

Keep the asset names and paths unchanged unless you update their references too. If the STL changes, its per-face coloring metadata and marker positions must be reassessed; they are specific to this mesh. Display normalization does not establish physical STL units. The dimensions on the page come from the design plan and remain provisional.

For a real inquiry form, replace the demo submit handler in `app.js` with a request to your chosen verified backend or form provider. Update the visible demo and privacy wording, add server-side validation, and show delivery success only after acceptance by that service.

After your final GitHub Pages URL is known, you may add an absolute canonical URL and `og:url` in `index.html`, and change `og:image` from `assets/shelter-field.webp` to its full published URL for social-sharing previews. No former private-hosting URL is included in this package.

## Source checks

With Node.js installed, run `npm run check`. No `npm install` is needed. The checks parse the actual STL and verify its SHA-256, model framing across 24 camera/screen combinations, useful feature visibility, local links and assets, and valid/invalid demo inquiry inputs.

## Attribution

The project is developed by Calculated Visions: Tayybah Iqbal, Derrick Kiel, Alejandro Calero, and Elham Aslami. Supplied documents and imagery retain their original ownership. Three.js retains its MIT license in `vendor/THREE-LICENSE.txt`.

## GitHub reference instructions

- [Configure a GitHub Pages publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [Create a GitHub Pages site](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)
- [Upload files to a repository](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository)
