pipeline {
    agent any

    environment {
        AWS_REGION     = "us-east-1"
        AWS_ACCOUNT_ID = "016311861830"
        ECR_REPO_NAME  = "dev/crypto-backend"
        ECS_CLUSTER    = "my-ecs-cluster"
        ECS_SERVICE    = "backend-service"
        TASK_DEF_NAME  = "backend-task"  // your ECS task definition family name
        IMAGE_TAG      = "${GIT_COMMIT}" // Use Git commit SHA as image tag
        IMAGE_URI      = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO_NAME}:${IMAGE_TAG}"
    }

    stages {
        stage('Checkout') {
            steps {
                // Public repo, no credentials needed
                git branch: 'main', url: 'https://github.com/ankit-ht/crypto-dashboard-backend.git'
            }
        }

        stage('Login to AWS ECR') {
            steps {
                withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: 'aws-jenkins-creds']]) {
                    sh '''
                        aws ecr get-login-password --region $AWS_REGION | \
                        docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
                    '''
                }
            }
        }

        stage('Build and Push Docker Image') {
            steps {
                sh '''
                    cd server
                    docker build -t $ECR_REPO_NAME:$IMAGE_TAG .
                    docker tag $ECR_REPO_NAME:$IMAGE_TAG $IMAGE_URI
                    docker push $IMAGE_URI
                '''
            }
        }

        stage('Register New Task Definition and Deploy') {
            steps {
                withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: 'aws-jenkins-creds']]) {
                    script {
                        // Fetch current task definition JSON
                        def taskDefJson = sh(
                            script: "aws ecs describe-task-definition --task-definition $TASK_DEF_NAME --region $AWS_REGION",
                            returnStdout: true
                        ).trim()

                        // Update container image using jq
                        def newContainerDef = sh(
                            script: "echo '$taskDefJson' | jq --arg IMAGE '$IMAGE_URI' '.taskDefinition.containerDefinitions[0].image = $IMAGE | .taskDefinition.containerDefinitions'",
                            returnStdout: true
                        ).trim()

                        // Extract fields from existing task definition
                        def family = sh(script: "echo '$taskDefJson' | jq -r '.taskDefinition.family'", returnStdout: true).trim()
                        def taskRoleArn = sh(script: "echo '$taskDefJson' | jq -r '.taskDefinition.taskRoleArn'", returnStdout: true).trim()
                        def executionRoleArn = sh(script: "echo '$taskDefJson' | jq -r '.taskDefinition.executionRoleArn'", returnStdout: true).trim()
                        def networkMode = sh(script: "echo '$taskDefJson' | jq -r '.taskDefinition.networkMode'", returnStdout: true).trim()
                        def volumes = sh(script: "echo '$taskDefJson' | jq '.taskDefinition.volumes'", returnStdout: true).trim()
                        def placementConstraints = sh(script: "echo '$taskDefJson' | jq '.taskDefinition.placementConstraints'", returnStdout: true).trim()
                        def memory = "1024"  // 1GB memory as requested

                        // Conditionally include taskRoleArn and executionRoleArn only if not null or "null"
                        def taskRoleArnField = (taskRoleArn && taskRoleArn != "null") ? "\"taskRoleArn\": \"$taskRoleArn\"," : ""
                        def executionRoleArnField = (executionRoleArn && executionRoleArn != "null") ? "\"executionRoleArn\": \"$executionRoleArn\"," : ""

                        // Build new task definition JSON string
                        def newTaskDefJson = """
                        {
                            "family": "$family",
                            ${taskRoleArnField}
                            ${executionRoleArnField}
                            "networkMode": "$networkMode",
                            "containerDefinitions": $newContainerDef,
                            "volumes": $volumes,
                            "placementConstraints": $placementConstraints,
                            "requiresCompatibilities": [],
                            "memory": "$memory"
                        }
                        """

                        // Write new task definition JSON to file
                        writeFile file: 'new-task-def.json', text: newTaskDefJson

                        // Register new task definition revision
                        def registerOutput = sh(
                            script: "aws ecs register-task-definition --cli-input-json file://new-task-def.json --region $AWS_REGION",
                            returnStdout: true
                        ).trim()

                        def registerJson = readJSON text: registerOutput
                        def newRevision = registerJson.taskDefinition.revision

                        echo "Registered new task definition revision: $newRevision"

                        // Update ECS service to use new task definition revision and force new deployment
                        sh """
                            aws ecs update-service --cluster $ECS_CLUSTER --service $ECS_SERVICE --task-definition $TASK_DEF_NAME:$newRevision --region $AWS_REGION --force-new-deployment
                        """
                    }
                }
            }
        }
    }

    post {
        success {
            echo 'Deployment successful!'
        }
        failure {
            echo 'Deployment failed!'
        }
    }
}
