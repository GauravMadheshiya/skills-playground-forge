<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Career platform architecture
- Keep the uploaded static role catalog in src/data/catalog.ts as the single source of role and skill requirements, so scoring and all career tools stay consistent.
- Share session and progress through CareerProvider; persist guest-only progress locally and authenticated progress in the owner-scoped career_progress table, so guest migration never exposes another account's data.
- Keep every career page public to support guest workflows; enforce account ownership with database RLS on all saved progress.
- Parse resumes with browser-only dynamic imports and keep resume contents on the device, avoiding server-side document handling and private resume uploads.
- Use shared semantic design tokens in src/styles.css and shared UI components across all content routes, so navigation and career views remain consistent.
- Apply theme overrides on the document root and store only the local display preference, so all pages and dialogs share the selected theme without changing career progress.
- Resolve skill learning resources through resourcesFor in the role catalog and display them in LearningOptions, so every roadmap skill shares categorized provider discovery links with human-readable queries.
- Present curated career boards explicitly as collections rather than verified live vacancies, so static examples never misrepresent hiring availability.
