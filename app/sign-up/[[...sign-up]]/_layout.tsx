import { Icons } from "@/components/icons";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

type AuthLayoutProps = {
  readonly children: ReactNode;
};

const AuthLayout = ({ children }: AuthLayoutProps) => (
  <div className="container relative grid h-dvh flex-col items-center justify-center px-4 lg:max-w-none lg:grid-cols-2 lg:px-0">
    <div className="relative hidden h-full flex-col bg-muted p-10 text-white dark:border-r lg:flex">
      <div className="absolute inset-0 bg-zinc-900">
        <div className="relative h-dvh w-full">
          <Image 
            src="/side.png" 
            alt="Background image"
            width={1200}
            height={1800}
            priority
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="from-color-2 to-color-5 absolute inset-0 bg-gradient-to-t opacity-50 z-10" />
        </div>
      </div>
      <div className="relative z-20 flex items-center text-lg font-medium">
        <div className="flex items-center gap-[0.018rem] data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
          
        </div>
      </div>

      <div className="relative z-20 mt-auto">
        <blockquote className="space-y-2">
          
          {/* <footer className="text-sm">Sofia Davis</footer> */}
        </blockquote>
      </div>
    </div>
    <div className="flex w-full items-center justify-center py-8 lg:p-8">
      <div className="mx-auto flex w-full max-w-[400px] flex-col items-center justify-center space-y-6">
        {children}
        <p className="px-4 text-center text-sm text-muted-foreground">
          By clicking continue, you agree to our{" "}
          <Link
            href={"/legal/terms"}
            className="underline underline-offset-4 hover:text-primary"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href={"/legal/privacy"}
            className="underline underline-offset-4 hover:text-primary"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  </div>
);

export default AuthLayout;