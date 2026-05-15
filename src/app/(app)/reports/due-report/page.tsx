import { redirect } from 'next/navigation';

// The due report lives at /buyers/dues — redirect there
export default function DueReportPage() {
  redirect('/buyers/dues');
}
