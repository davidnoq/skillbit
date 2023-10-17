"use client";

import Nav from "@/components/nav";
import Arrow from "../../public/assets/icons/arrow.svg";
import Image from "next/image";
import Link from "next/link";
import { FormEvent } from "react";
import LoginGraphic1 from "../../public/assets/images/loginGraphic1.png";
import LoginGraphic2 from "../../public/assets/images/loginGraphic2.png";
import { motion } from "framer-motion";
import Logo from "../../public/assets/branding/logos/logo_mini_transparent_white.png";
import { useRouter } from "next/navigation";

const Auth = () => {
  const router = useRouter();

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
  };

  return (
    <>
      <div className="max-w-screen text-white bg-slate-900 graphPaper min-h-screen flex items-center justify-center">
        {/* <div className="meshGradient3 -z-10"></div> */}
        <div className="flex-1 p-6">
          <div className="flex gap-2 items-center justify-center absolute top-6 left-6">
            <Image
              src={Logo}
              alt=""
              width={100}
              height={100}
              style={{ margin: "-30px" }}
            ></Image>
            <h1 className="">Skillbit</h1>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              router.push("/dashboard");
            }}
            className="flex flex-col gap-2 max-w-sm m-auto"
          >
            <h1>Welcome Back!</h1>
            <p className="text-gray-500 mb-10">
              Login to continue reimagining your technical interviews.
            </p>
            <p>Email</p>
            <input
              type="email"
              placeholder="mail@example.com"
              className="p-2 rounded-lg placeholder:text-gray-500 text-white bg-white bg-opacity-10"
            />
            <p>Password</p>
            <input
              type="password"
              placeholder="Minimum 8 Characters"
              className="p-2 rounded-lg placeholder:text-gray-500 text-white bg-white bg-opacity-10"
            />
            <div className="flex justify-between">
              <div className="flex gap-2 items-center text-gray-500">
                <input type="checkbox" className="bg-white bg-opacity-10" />
                <p>Remember me</p>
              </div>
              <p className="text-gray-500">
                <Link href={""}>Forgot your password?</Link>
              </p>
            </div>
            <button className="mt-10 w-full bg-indigo-600 px-6 py-3 rounded-lg flex justify-center items-center m-auto hover:bg-opacity-100 duration-200">
              Login{" "}
              <div className=" arrow flex items-center justify-center">
                <div className="arrowMiddle"></div>
                <div>
                  <Image
                    src={Arrow}
                    alt=""
                    width={14}
                    height={14}
                    className="arrowSide"
                  ></Image>
                </div>
              </div>
            </button>
            <p className="text-gray-500">
              No account yet? <Link href="">Create an account.</Link>
            </p>
          </form>
        </div>
        <motion.div
          whileHover={"hover"}
          className="flex-1 loginAccentBackground h-screen p-6 flex items-center justify-center hideElement border-l border-slate-700 relative overflow-hidden"
        >
          {/* TOP */}
          <motion.div
            initial={{ scale: 1 }}
            variants={{
              hover: {
                scale: 1.1,
              },
            }}
            transition={{
              duration: 1,
              ease: "backInOut",
            }}
            className="w-96 h-96 bg-white opacity-10 rounded-lg absolute -left-32 -top-32"
          ></motion.div>

          <motion.div
            initial={{ scale: 1 }}
            variants={{
              hover: {
                scale: 1.1,
              },
            }}
            transition={{
              duration: 1,
              ease: "backInOut",
            }}
            className="w-64 h-64 bg-white opacity-10 rounded-lg absolute left-32 -top-32"
          ></motion.div>

          <motion.div
            initial={{ scale: 1 }}
            variants={{
              hover: {
                scale: 1.1,
              },
            }}
            transition={{
              duration: 1.2,
              ease: "backInOut",
            }}
            className="w-64 h-64 bg-white opacity-10 rounded-lg absolute -left-32 top-32"
          ></motion.div>

          <motion.div
            initial={{ scale: 1 }}
            variants={{
              hover: {
                scale: 1.5,
              },
            }}
            transition={{
              duration: 1.2,
              ease: "backInOut",
            }}
            className="w-24 h-24 bg-white opacity-10 rounded-lg absolute left-80 -top-12"
          ></motion.div>

          <motion.div
            initial={{ scale: 1 }}
            variants={{
              hover: {
                scale: 1.5,
              },
            }}
            transition={{
              duration: 1,
              ease: "backInOut",
            }}
            className="w-24 h-24 bg-white opacity-10 rounded-lg absolute left-16 top-48"
          ></motion.div>

          {/* BOTTOM */}
          <motion.div
            initial={{ scale: 1 }}
            variants={{
              hover: {
                scale: 1.1,
              },
            }}
            transition={{
              duration: 1,
              ease: "backInOut",
            }}
            className="w-96 h-96 bg-white opacity-10 rounded-lg absolute -right-32 -bottom-32"
          ></motion.div>

          <motion.div
            initial={{ scale: 1 }}
            variants={{
              hover: {
                scale: 1.1,
              },
            }}
            transition={{
              duration: 1,
              ease: "backInOut",
            }}
            className="w-64 h-64 bg-white opacity-10 rounded-lg absolute right-32 -bottom-32"
          ></motion.div>

          <motion.div
            initial={{ scale: 1 }}
            variants={{
              hover: {
                scale: 1.1,
              },
            }}
            transition={{
              duration: 1.2,
              ease: "backInOut",
            }}
            className="w-64 h-64 bg-white opacity-10 rounded-lg absolute -right-32 bottom-32"
          ></motion.div>

          <motion.div
            initial={{ scale: 1 }}
            variants={{
              hover: {
                scale: 1.5,
              },
            }}
            transition={{
              duration: 1.2,
              ease: "backInOut",
            }}
            className="w-24 h-24 bg-white opacity-10 rounded-lg absolute right-80 -bottom-12"
          ></motion.div>

          <motion.div
            initial={{ scale: 1 }}
            variants={{
              hover: {
                scale: 1.5,
              },
            }}
            transition={{
              duration: 1,
              ease: "backInOut",
            }}
            className="w-24 h-24 bg-white opacity-10 rounded-lg absolute right-16 bottom-48"
          ></motion.div>

          <div className="flex">
            <motion.div
              className="w-32 h-32 bg-white rounded-3xl rotate-45 -mr-2"
              initial={{ scale: 1, rotate: 45 }}
              variants={{
                hover: {
                  scale: 1,
                },
              }}
              transition={{
                duration: 0.5,
                ease: "backInOut",
              }}
            ></motion.div>
            <motion.div
              className="w-32 h-32 bg-white rounded-3xl rotate-45 -ml-2"
              initial={{ scale: 1, rotate: 45 }}
              variants={{
                hover: {
                  scale: 1,
                },
              }}
              transition={{
                duration: 0.5,
                ease: "backInOut",
              }}
            ></motion.div>
            {/* <motion.div
              initial={{ scale: 0.9 }}
              variants={{
                hover: {
                  scale: 1.1,
                },
              }}
              transition={{
                duration: 0.5,
                ease: "backInOut",
              }}
              className="w-48 h-48 -mr-24 z-10"
            >
              <Image src={LoginGraphic2} alt=""></Image>
            </motion.div>
            <motion.div
              initial={{ scale: 0.9 }}
              variants={{
                hover: {
                  scale: 1.2,
                },
              }}
              transition={{
                duration: 0.8,
                ease: "backInOut",
              }}
              className="w-64 h-64 -mt-36"
            >
              <Image src={LoginGraphic1} alt=""></Image>
            </motion.div> */}
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default Auth;
