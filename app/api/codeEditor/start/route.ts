import createContainer from "../../createContainer/createContainer";
import prisma from "../../database/prismaConnection";
const Docker = require("dockerode");
const docker = new Docker();
import { startTest } from "../../database/actions";

const DOCKER_EC2_TOGGLE = true;

export async function POST(req: Request) {
  if (DOCKER_EC2_TOGGLE) {
    console.log("EC2");
    const body = await req.json();
    const containerName = body.testID;

    let ports;

    const test = await prisma.testID.findUnique({
      where: {
        id: containerName,
      },
    });

    console.log(test);

    if (!test) {
      return Response.json({
        message: "invalid",
      });
    }

    // start the timer
    // let startEnd = { startTime: test.startTime, endTime: test.endTime };
    if (!test.startTime && !test.endTime) {
      await startTest(test.id);
    }

    const startEnd = await prisma.testID.findUnique({
      where: {
        id: containerName,
      },
      select: {
        startTime: true,
        endTime: true,
      },
    });

    try {
      const response = await createContainer(
        process.env.BACKEND_KEY,
        containerName
      );

      ports = response;
    } catch (error) {
      console.error("Error getting response from Lambda:", error);
      return Response.json(
        {
          message: "Error getting response from Lambda",
        },
        { status: 400 }
      );
    }

    // console.log("ports:", JSON.stringify({ ports, startEnd }));

    console.log(
      {
        ports: ports,
        startTime: startEnd?.startTime,
        endTime: startEnd?.endTime,
      },
      { status: 200 }
    );

    return Response.json(
      {
        ports: ports,
        startTime: startEnd?.startTime,
        endTime: startEnd?.endTime,
      },
      { status: 200 }
    );
    return new Response(JSON.stringify(ports));
  } else {
    //LOCAL DOCKER (probably will never use again but keeping just in case)
    console.log("LOCAL");
    const body = await req.json();
    const containerName = body.testID;
    const containers = await docker.listContainers({ all: true });
    const container = containers.find((container: any) =>
      container.Names.includes(`/${containerName}`)
    );

    const test = await prisma.testID.findUnique({
      where: {
        id: containerName,
      },
    });

    if (!test) {
      return new Response("invalid");
    }

    if (container) {
      console.log(`Container '${containerName}' already exists.`);
      const containerInfo = await docker.getContainer(container.Id).inspect();
      const portBindings = containerInfo.HostConfig.PortBindings;

      const ports = {
        webServer: portBindings["3000/tcp"][0].HostPort,
        socketServer: portBindings["9999/tcp"][0].HostPort,
      };
      console.log(ports);

      return new Response(JSON.stringify(ports));
    }

    const socketServerPort = 3001 + 2 * Math.floor(Math.random() * 500);
    const webServerPort = 3002 + 2 * Math.floor(Math.random() * 499);

    docker.createContainer(
      {
        name: containerName,
        Image: "code_runner",
        ExposedPorts: {
          "9999/tcp": {},
          "3000/tcp": {},
        },
        HostConfig: {
          PortBindings: {
            "9999/tcp": [
              {
                HostPort: socketServerPort.toString(),
              },
            ],
            "3000/tcp": [
              {
                HostPort: webServerPort.toString(),
              },
            ],
          },
        },
      },
      (err: any, container: any) => {
        if (err) {
          console.log(err);
          return new Response("error");
        } else {
          container.start().then(() => {
            console.log(container.id);
            return new Response("success");
          });
        }
      }
    );
    const ports = {
      webServer: webServerPort,
      socketServer: socketServerPort,
    };

    return new Response(JSON.stringify(ports));
  }
}
