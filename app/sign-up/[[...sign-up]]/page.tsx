import { SignUp } from '@clerk/nextjs';
import AuthLayout from './_layout';

export default function Page() {
  return (
    <AuthLayout>
      <SignUp />
    </AuthLayout>
  );
}
