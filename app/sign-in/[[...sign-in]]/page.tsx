import { SignIn } from '@clerk/nextjs';
import AuthLayout from './_layout';

export default function Page() {
  return (
    <AuthLayout>
      <SignIn />
    </AuthLayout>
  );
}
