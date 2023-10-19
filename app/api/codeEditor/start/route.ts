const Docker = require("dockerode");

const docker = new Docker();

export async function GET(req: Request) {
  docker.createContainer(
    {
      Image: "skillbit",
      ExposedPorts: {
        "9999/tcp": {},
      },
      HostConfig: {
        PortBindings: {
          "9999/tcp": [
            {
              HostPort: "9999",
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
}
