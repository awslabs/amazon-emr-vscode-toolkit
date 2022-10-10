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
RUN echo -e "spark.submit.deployMode\tclient\nspark.master\tlocal[*]\nspark.hadoop.fs.s3.customAWSCredentialsProvider\tcom.amazonaws.auth.EnvironmentVariableCredentialsProvider\n" >> /etc/spark/conf/spark-defaults.conf

# Use the Glue Data Catalog
RUN echo -e "\n# Enable Glue Data Catalog\nspark.sql.catalogImplementation\thive\nspark.hadoop.hive.metastore.client.factory.class\tcom.amazonaws.glue.catalog.metastore.AWSGlueDataCatalogHiveClientFactory\n" >> /etc/spark/conf/spark-defaults.conf

# Configure log4j to ignore EC2 metadata access failure-related error messages
RUN echo -e "\n\nlog4j.logger.com.amazonaws.internal.InstanceMetadataServiceResourceFetcher=FATAL\nlog4j.logger.com.amazonaws.util.EC2MetadataUtils=FATAL" >> /etc/spark/conf/log4j.properties

# Don't log INFO messages to the console 
RUN sed -i s/log4j.rootCategory=.*/log4j.rootCategory=WARN,console/ /etc/spark/conf/log4j.properties

# Allow hadoop user to sudo for admin tasks
RUN yum install -y sudo && \
     echo "hadoop ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Upgrade to AWS CLI v2
RUN yum install -y git unzip && \
     curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && \
     unzip awscliv2.zip && \
     ./aws/install && \
     rm -rf aws awscliv2.zip

# Install ripgrep for file selection
RUN sudo curl -o "/etc/yum.repos.d/rg.repo" \
     https://copr.fedorainfracloud.org/coprs/carlwgeorge/ripgrep/repo/epel-7/carlwgeorge-ripgrep-epel-7.repo && \
     sudo yum install -y ripgrep

# Enable Jupyter notebooks
RUN python3 -m pip install -U pip ipykernel

# Switch back to the default user
USER hadoop:hadoop
