"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import Nav from "@/components/nav";
import Image from "next/image";
import Arrow from "../../public/assets/icons/arrow.svg";
import Demo from "../../public/assets/images/demo.png";
import Logo from "../../public/assets/branding/logos/logo_mini_transparent_indigo.png";

//dashboard icons
import DashboardIcon from "../../public/assets/icons/dashboard.svg";
import DashboardIconWhite from "../../public/assets/icons/dashboard_white.svg";
import ApplicantsIcon from "../../public/assets/icons/applicants.svg";
import CompanyIcon from "../../public/assets/icons/company.svg";
import SupportIcon from "../../public/assets/icons/support.svg";
import WorkshopIcon from "../../public/assets/icons/workshop.svg";
import ProfileIcon from "../../public/assets/icons/profile.svg";
import QuestionIcon from "../../public/assets/icons/question.svg";
import SearchIcon from "../../public/assets/icons/search.svg";

const Dashboard = () => {
  const path = usePathname();

  return (
    <>
      <div className="max-w-screen text-white flex">
        <div className="bg-white h-screen flex-1 max-w-xs border-gray-200 border-r p-6 relative">
          <div className="flex items-center gap-2">
            <Image
              src={Logo}
              alt=""
              width={110}
              height={110}
              style={{ margin: "-30px" }}
            ></Image>
            <h1 className="text-indigo-600 text-3xl">Skillbit</h1>
          </div>
          <div className="flex flex-col justify-between mt-6">
            <ul className="list-none text-gray-500 flex flex-col gap-2">
              {path == "/dashboard" && (
                <li className="p-2 rounded-lg flex items-center gap-2 bg-indigo-600 text-white">
                  <Image
                    src={DashboardIconWhite}
                    alt=""
                    width={25}
                    height={25}
                  ></Image>
                  <p>Dashboard</p>
                </li>
              )}
              {path != "/dashboard" && (
                <li className="p-2 rounded-lg flex items-center gap-2 hover:bg-indigo-100">
                  <Image
                    src={DashboardIcon}
                    alt=""
                    width={25}
                    height={25}
                  ></Image>
                  <p>Dashboard</p>
                </li>
              )}
              <li className="p-2 rounded-lg flex items-center gap-2 hover:bg-indigo-100">
                <Image
                  src={ApplicantsIcon}
                  alt=""
                  width={25}
                  height={25}
                ></Image>
                <p>Applicants</p>
              </li>
              <li className="p-2 rounded-lg flex items-center gap-2 hover:bg-indigo-100">
                <Image src={CompanyIcon} alt="" width={25} height={25}></Image>
                <p>Company Profile</p>
              </li>
              <li className="p-2 rounded-lg flex items-center gap-2 hover:bg-indigo-100">
                <Image src={WorkshopIcon} alt="" width={25} height={25}></Image>
                <p>Question Workshop</p>
              </li>
            </ul>
            {/* <ul className="list-none text-gray-500 flex flex-col gap-2">
              <li className="p-2 rounded-lg flex items-center gap-2 hover:bg-indigo-100">
                <Image src={SupportIcon} alt="" width={25} height={25}></Image>
                <p>Contact Support</p>
              </li>
            </ul> */}
          </div>
        </div>
        <div className="bg-gray-50 h-screen flex-1">
          <div className="bg-white border-b border-gray-200 flex justify-between p-3">
            <div className="flex-1 max-w-xl bg-gray-100 p-2 rounded-lg flex justify-between">
              <input
                className="text-gray-500 bg-transparent focus:outline-none w-full placeholder:text-gray-500"
                placeholder="Search Anything..."
              ></input>
              <Image src={SearchIcon} alt="" width={25} height={25}></Image>
            </div>
            <div className="flex-1 flex justify-end gap-1">
              <Image src={QuestionIcon} alt="" width={25} height={25}></Image>
              <Image src={ProfileIcon} alt="" width={25} height={25}></Image>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
