# See here for image details: https://docs.aws.amazon.com/emr/latest/EMR-on-EKS-DevelopmentGuide/docker-custom-images-steps.html
# Arguments used to build the image URI - update to your desired region/EMR release version per the link above
ARG RELEASE="emr-6.6.0"
ARG RELEASE_TAG="latest"
ARG REGION="us-west-2"
ARG EMR_ACCOUNT_ID="895885662937"

FROM ${EMR_ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/spark/${RELEASE}:${RELEASE_TAG}

# Switch to the root user to do some customization
USER root

# Update Spark config for local development
RUN echo -e "spark.submit.deployMode\tclient\nspark.master\tlocal[*]\nspark.hadoop.fs.s3.customAWSCredentialsProvider\tcom.amazonaws.auth.EnvironmentVariableCredentialsProvider" >> /etc/spark/conf/spark-defaults.conf

# Don't log INFO messages to the console 
RUN sed -i s/log4j.rootCategory=.*/log4j.rootCategory=WARN,console/ /etc/spark/conf/log4j.properties

# Allow hadoop user to sudo for admin tasks
RUN yum install -y sudo && \
     echo "hadoop ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Upgrade to AWS CLI v2
RUN yum install -y unzip && \
     curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && \
     unzip awscliv2.zip && \
     ./aws/install && \
     rm -rf aws awscliv2.zip

# Switch back to the default user
USER hadoop:hadoop
