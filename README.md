# Amazon EMR Toolkit for VS Code (Developer Preview)

EMR Toolkit is a VS Code Extension to make it easier to develop Spark jobs on EMR.

## Features

With the EMR toolkit, you can browse job runs and steps across EMR on EC2, EMR on EKS, and EMR Serverless. 

In addition, using the `Create local Spark environment` command you can create a [development container](https://code.visualstudio.com/docs/remote/containers) based off of an EMR on EKS image for the EMR version you choose. This container can be used to develop Spark and PySpark code locally that is fully compatible with your remote EMR environment.

Full list of features:

* Browse EMR on EC2 clusters
    * List installed Apps and Steps
* Browse EMR on EKS virtual clusters and job runs
* Browse EMR Serverless applications and job runs
* Ability to create an EMR Spark devcontainer for local development

## Requirements

- A local [AWS profile](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html)
- Access to the AWS API to list EMR resources
- Docker (if you want to use the devcontainer)

## Future Considerations

- Support for Glue Data Catalog
- Allow for the ability to select different profiles
- Persist state (region selection)
- Create a Java environment
- Automate deployments to EMR
    - Create virtualenv and upload to S3
    - Pack pom into jar file
- Link to open logs in S3 or CloudWatch
- Testing :) https://vscode.rocks/testing/


## Feedback Notes

I'm looking for feedback in a few different areas:

- How do you use Spark on EMR today?
    - EMR on EC2, EMR on EKS, or EMR Serverless
    - PySpark, Scala Spark, or SparkSQL
- Does the tool work as expected for browsing your EMR resources
- Do you find the devcontainer useful for local development
- What functionality is missing that you would like to see

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This project is licensed under the Apache-2.0 License.
