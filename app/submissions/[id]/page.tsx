/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @next/next/no-async-client-component */
// @ts-nocheck

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CodeRunner from "./CodeRunner";
import Dropdown from "../../../public/assets/icons/dropdown.svg";
import Image from "next/image";
import { useSession } from "next-auth/react";
import Loader from "@/components/loader/loader";
import { Toaster, toast } from "react-hot-toast";
import Sidebar from "@/components/sidebar/sidebar";
import GaugeChart from "@/components/gaugechart/gaugechart";

interface TestIDInterface {
  companyID: string;
  id: string;
  selected: boolean;
  created: Date;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  score: string;
  submitted: boolean;
  template: Question;
  expirationDate: Date;
  instructions: string;
}

interface GradingInsights {
  totalScore: number;
  correctness: GradingInsightsCategory;
  efficiency: GradingInsightsCategory;
  codeStyle: GradingInsightsCategory;
  problemSolvingApproach: GradingInsightsCategory;
  edgeCaseHandling: GradingInsightsCategory;
  clarity: GradingInsightsCategory;
}

interface GradingInsightsCategory {
  score: number;
  explanation: string;
}

export default function Submissions({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [gradingInsights, setGradingInsights] = useState<GradingInsights>();

  const [email, setEmail] = useState("");
  const [userCompanyName, setUserCompanyName] = useState<string | null>(null);
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);
  const [userApprovalStatus, setUserApprovalStatus] = useState(false);
  const [companyDataLoaded, setCompanyDataLoaded] = useState(false);

  const [candidate, setCandidate] = useState<TestIDInterface>();
  // Track expanded details for each candidate
  const [isExpanded, setIsExpanded] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);

  // useEffect(() => {
  //   // Listen for changes in localStorage
  //   const handleStorageChange = () => {
  //     const gradingInsightsString =
  //       localStorage.getItem("gradingInsights") || "";

  //     const gradingInsightsParsed = JSON.parse(gradingInsightsString);
  //     gradingInsightsParsed.data.response = JSON.parse(
  //       gradingInsightsParsed.data.response
  //     );

  //     const gradingInsightsSimplified =
  //       gradingInsightsParsed.data.response.response[0];

  //     console.log("gradingInsightsSimplified:", gradingInsightsSimplified);

  //     const gradingInsightsSetup: GradingInsights = {
  //       totalScore: gradingInsightsSimplified.total_score,
  //       correctness: {
  //         score: gradingInsightsSimplified.correctness[0].score,
  //         explanation: gradingInsightsSimplified.correctness[0].explanation,
  //       },
  //       efficiency: {
  //         score: gradingInsightsSimplified.efficiency[0].score,
  //         explanation: gradingInsightsSimplified.efficiency[0].explanation,
  //       },
  //       codestyle: {
  //         score: gradingInsightsSimplified.codestyle[0].score,
  //         explanation: gradingInsightsSimplified.codestyle[0].explanation,
  //       },
  //       problemsolvingapproach: {
  //         score: gradingInsightsSimplified.problemsolvingapproach[0].score,
  //         explanation:
  //           gradingInsightsSimplified.problemsolvingapproach[0].explanation,
  //       },
  //       edgecasehandling: {
  //         score: gradingInsightsSimplified.edgecasehandling[0].score,
  //         explanation:
  //           gradingInsightsSimplified.edgecasehandling[0].explanation,
  //       },
  //       clarity: {
  //         score: gradingInsightsSimplified.clarity[0].score,
  //         explanation: gradingInsightsSimplified.clarity[0].explanation,
  //       },
  //     };

  //     console.log(gradingInsightsSetup);

  //     setGradingInsights(gradingInsightsSetup);
  //   };

  //   window.addEventListener("storage", handleStorageChange);

  //   return () => {
  //     window.removeEventListener("storage", handleStorageChange);
  //   };
  // }, []);

  useEffect(() => {
    getTestIdData();
  }, []);

  const getTestIdData = async () => {
    try {
      const testResponse = await fetch("/api/database", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "getTestById",
          id: params.id,
        }),
      });

      const testData = await testResponse.json();
      console.log("Test data response:", testData);
      setCandidate(testData.message);

      if (!testData.message) {
        console.log("No test data found, redirecting to /not-found");
        router.push("/not-found");
        return;
      }
    } catch (error) {
      console.error("Error fetching testID:", error);
      toast.error("Error fetching testID.");
    }
  };

  const getGradingInsights = async () => {
    try {
      toast.loading("Loading grading insights...");
      const res = await fetch("/api/database", {
        method: "POST",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify({
          action: "getGradingInsights",
          id: params.id,
        }),
      });
      const gradingInsightsString = await res.json();

      const gradingInsightsParsed = JSON.parse(
        gradingInsightsString.message.gradingInsights
      );

      console.log("gradingInsightsParsed:", gradingInsightsParsed);

      const gradingInsightsSimplified = gradingInsightsParsed.response[0];

      console.log("gradingInsightsSimplified:", gradingInsightsSimplified);

      const gradingInsightsSetup: GradingInsights = {
        totalScore: gradingInsightsSimplified.total_score,
        correctness: {
          score: gradingInsightsSimplified.correctness[0].score,
          explanation: gradingInsightsSimplified.correctness[0].explanation,
        },
        efficiency: {
          score: gradingInsightsSimplified.efficiency[0].score,
          explanation: gradingInsightsSimplified.efficiency[0].explanation,
        },
        codestyle: {
          score: gradingInsightsSimplified.codestyle[0].score,
          explanation: gradingInsightsSimplified.codestyle[0].explanation,
        },
        problemsolvingapproach: {
          score: gradingInsightsSimplified.problemsolvingapproach[0].score,
          explanation:
            gradingInsightsSimplified.problemsolvingapproach[0].explanation,
        },
        edgecasehandling: {
          score: gradingInsightsSimplified.edgecasehandling[0].score,
          explanation:
            gradingInsightsSimplified.edgecasehandling[0].explanation,
        },
        clarity: {
          score: gradingInsightsSimplified.clarity[0].score,
          explanation: gradingInsightsSimplified.clarity[0].explanation,
        },
      };

      console.log("gradingInsightsSetup:", gradingInsightsSetup);

      setGradingInsights(gradingInsightsSetup);
      toast.remove();
    } catch (error) {
      toast.remove();
      console.error("Error loading grading insights:", error);
    }
  };

  useEffect(() => {
    const getData = async () => {
      if (session) {
        toast.remove();
        toast.loading("Loading data...");

        setEmail(session.user?.email || "");

        // 1) find user by email
        const userRes = await fetch("/api/database", {
          method: "POST",
          headers: { "Content-type": "application/json" },
          body: JSON.stringify({
            action: "findUserByEmail",
            email: session.user?.email,
          }),
        });
        const userData = await userRes.json();
        if (
          userData?.message?.employee?.company?.id &&
          userData?.message?.employee?.company?.name &&
          userData?.message?.employee?.isApproved !== null
        ) {
          setUserCompanyId(userData.message.employee.company.id);
          setUserCompanyName(userData.message.employee.company.name);
          setUserApprovalStatus(userData.message.employee.isApproved);

          await loadJobs(userData.message.employee.company.id);

          await getGradingInsights();
        }
        setCompanyDataLoaded(true);
        toast.remove();
      }
    };

    if (status === "authenticated") {
      getData();
    }
  }, [session, status]);

  const loadJobs = async (companyId: string) => {
    try {
      toast.loading("Loading jobs...");
      const res = await fetch("/api/database", {
        method: "POST",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify({ action: "getCompanyJobs", companyId }),
      });
      toast.remove();
      const data = await res.json();
      setJobs(data.message || []);
    } catch (error) {
      toast.remove();
      console.error("Error loading jobs:", error);
    }
  };

  if (status === "loading") {
    return <Loader></Loader>;
  } else if (status === "unauthenticated") {
    router.push("/auth");
    return null;
  }
  return (
    <>
      <div className="max-w-screen text-white flex overflow-x-hidden max-h-screen overflow-y-hidden">
        {/* <Sidebar></Sidebar> */}
        <div className="p-6 bg-slate-950 flex gap-6 flex-1">
          <div className="flex-[1.5] relative rounded-lg border border-slate-800 overflow-hidden">
            <CodeRunner id={params.id}></CodeRunner>
          </div>
          <div className="flex-[0.5] flex flex-col gap-6">
            <div className="">
              <h1 className="">Grading Insights</h1>
              {candidate && (
                <div className="mt-2 flex items-center gap-2">
                  <div
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="cursor-pointer relative flex gap-2 items-center justify-center bg-slate-900 px-3 py-1 rounded-full border border-slate-800 w-fit text-xs"
                  >
                    View Candidate Details
                    <Image
                      src={Dropdown}
                      alt="Dropdown menu arrow"
                      width={15}
                      height={15}
                      className={
                        isExpanded
                          ? "rotate-0 opacity-25 duration-100"
                          : "-rotate-90 opacity-25 duration-100"
                      }
                    ></Image>
                    {isExpanded && (
                      <div className="absolute bg-slate-900 border border-slate-800 p-6 top-10 rounded-lg right-0">
                        <p className="text-slate-400 mb-1 flex gap-2 items-center">
                          <p>Test ID:</p>
                          <p className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white">
                            {candidate.id}
                          </p>
                        </p>
                        <p className="text-slate-400 mb-1 flex gap-2 items-center">
                          <p>Email:</p>
                          <p className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white">
                            {candidate.email}
                          </p>
                        </p>
                        <p className="text-slate-400 mb-1 flex gap-2 items-center">
                          <p>Job:</p>
                          <p className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white">
                            {candidate.jobId
                              ? jobs.find((j) => j.id === candidate.jobId)
                                  ?.name || candidate.jobId
                              : "No job assigned"}
                          </p>
                        </p>
                        <p className="text-slate-400 mb-1 flex gap-2 items-center">
                          <p>Created:</p>
                          <p className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white">
                            {new Date(candidate.created).toLocaleString()}
                          </p>
                        </p>
                        {candidate.template && (
                          <p className="text-slate-400 mb-1 flex gap-2 items-center">
                            <p>Template:</p>
                            <p className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white">
                              {candidate.template.title}
                            </p>
                          </p>
                        )}
                        {candidate.expirationDate && (
                          <p className="text-slate-400 mb-1 flex gap-2 items-center">
                            <p>Expiration:</p>{" "}
                            <p className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white">
                              {new Date(
                                candidate.expirationDate
                              ).toLocaleString()}
                            </p>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            {!gradingInsights && (
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="flex justify-center items-center scale-150 mt-6">
                  <div className="lds-ring">
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                  </div>
                </div>
                <p>Generating grading insights...</p>
              </div>
            )}
            {gradingInsights && (
              <div className="flex justify-center items-center">
                <GaugeChart percent={gradingInsights?.totalScore || 0} />
              </div>
            )}
            {gradingInsights && (
              <div className="flex items-center gap-2">
                <div className="flex gap-2 items-center justify-center bg-slate-900 px-3 py-1 rounded-full border border-slate-800 w-fit text-xs">
                  {gradingInsights.totalScore / 30 < 0.7 && (
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  )}
                  {gradingInsights.totalScore / 30 >= 0.7 && (
                    <div className="w-2 h-2 rounded-full bg-green-600"></div>
                  )}
                  {gradingInsights.totalScore / 30 < 0.7 && (
                    <p className="text-xs">Failed</p>
                  )}
                  {gradingInsights.totalScore / 30 >= 0.7 && (
                    <p className="text-xs">Passed</p>
                  )}
                </div>
                <div className="flex gap-2 items-center justify-center bg-slate-900 px-3 py-1 rounded-full border border-slate-800 w-fit text-xs">
                  <h1 className="text-xs">Raw Score:</h1>
                  <p className="text-xs">{gradingInsights.totalScore}/30</p>
                </div>
              </div>
            )}
            {gradingInsights && (
              <div
                className="flex-1 overflow-y-auto flex flex-col gap-6"
                style={{
                  scrollbarWidth: "thin",
                  scrollbarColor: "rgb(51 65 85) transparent",
                }}
              >
                {gradingInsights &&
                  Object.keys(gradingInsights)
                    .filter((key) => key !== "totalScore") // Exclude totalScore
                    .map((key) => (
                      <div
                        key={key}
                        className="bg-slate-900 border border-slate-800 rounded-lg p-6"
                      >
                        {key == "correctness" && <h1>Correctness</h1>}
                        {key == "efficiency" && <h1>Efficiency</h1>}
                        {key == "codestyle" && <h1>Code Style</h1>}
                        {key == "problemsolvingapproach" && (
                          <h1>Problem Solving Approach</h1>
                        )}
                        {key == "edgecasehandling" && (
                          <h1>Edge Case Handling</h1>
                        )}
                        {key == "clarity" && <h1>Clarity</h1>}
                        {gradingInsights[key].score == 5 && (
                          <div className="flex gap-2 items-center justify-center bg-slate-800 px-3 py-1 rounded-full border border-green-600 w-fit text-xs my-2">
                            <h1 className="text-xs">Score:</h1>
                            <p className="text-xs">
                              {gradingInsights[key].score}/5
                            </p>
                          </div>
                        )}
                        {(gradingInsights[key].score == 4 ||
                          gradingInsights[key].score == 3) && (
                          <div className="flex gap-2 items-center justify-center bg-slate-800 px-3 py-1 rounded-full border border-orange-400 w-fit text-xs my-2">
                            <h1 className="text-xs">Score:</h1>
                            <p className="text-xs">
                              {gradingInsights[key].score}/5
                            </p>
                          </div>
                        )}
                        {(gradingInsights[key].score == 2 ||
                          gradingInsights[key].score == 1 ||
                          gradingInsights[key].score == 0) && (
                          <div className="flex gap-2 items-center justify-center bg-slate-800 px-3 py-1 rounded-full border border-red-500 w-fit text-xs my-2">
                            <h1 className="text-xs">Score:</h1>
                            <p className="text-xs">
                              {gradingInsights[key].score}/5
                            </p>
                          </div>
                        )}
                        <p>{gradingInsights[key].explanation}</p>
                      </div>
                    ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
