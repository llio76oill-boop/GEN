import GeneratorProfilePage from './_client';

export const dynamicParams = false;

export function generateStaticParams() {
  // Static export requires at least one entry.
  // The actual id is resolved client-side via useParams().
  return [{ id: '_' }];
}

export default function Page() {
  return <GeneratorProfilePage />;
}
