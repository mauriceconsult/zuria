import { UserButton } from "@clerk/nextjs";
import { MainNav } from "./main-nav";
import ShopSwitcher from "./shop-switcher";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ThemeToggle } from "./ui/theme-toggle";
import { VendlyLogo } from "./ui/vendly-logo";

const Navbar = async () => {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }
  const shops = await prisma.shop.findMany({
    where: {
      userId,
    },
  });
  return (
    <div className="border-b">
      <div className="flex h-16 items-center px-4">
        <ShopSwitcher items={shops} />
        <MainNav className="mx-6" />
        <div className="ml-auto flex items-center space-x-6">
          <ThemeToggle />
          <VendlyLogo size={36} />
          <UserButton afterSwitchSessionUrl="/" />
        </div>
      </div>
    </div>
  );
};

export default Navbar;
