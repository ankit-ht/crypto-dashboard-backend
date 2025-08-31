pipeline {
    agent any

    environment {
        AWS_REGION        = "us-east-1"
        AWS_ACCOUNT_ID    = "016311861830"
        ECR_REPO_NAME     = "dev/crypto-backend"
        ECR_REPOSITORY_URI = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
    }

    stages {
        stage('Checkout') {
            steps {
                git branch: 'main',
                    url: 'https://github.com/ankit-ht/crypto-dashboard-backend.git',
                    credentialsId: 'github-token'
                
                script {
                    env.IMAGE_TAG = sh(script: "git rev-parse --short HEAD", returnStdout: true).trim()
                    env.ECR_IMAGE = "${ECR_REPOSITORY_URI}/${ECR_REPO_NAME}:${IMAGE_TAG}"
                }
            }
        }

        stage('Login to AWS ECR') {
            steps {
                withCredentials([[$class: 'AmazonWebServicesCredentialsBinding',
                                  credentialsId: 'aws-jenkins-creds']]) {
                    sh 'aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin ${ECR_REPOSITORY_URI}'
                }
            }
        }

        stage('Build & Push Docker Image') {
            steps {
                dir('server') {
                    sh """
                        docker build -t ${ECR_REPO_NAME}:${IMAGE_TAG} .
                        docker tag ${ECR_REPO_NAME}:${IMAGE_TAG} ${ECR_IMAGE}
                        docker push ${ECR_IMAGE}
                    """
                }
            }
        }

        stage('Cleanup Local Docker Images') {
            steps {
                sh """
                    docker rmi ${ECR_REPO_NAME}:${IMAGE_TAG} || true
                    docker rmi ${ECR_IMAGE} || true
                    docker builder prune -af
                    docker container prune -f
                    docker image prune -af
                """
            }
        }

        stage('Deploy to ECS') {
            steps {
                withCredentials([[$class: 'AmazonWebServicesCredentialsBinding',
                                  credentialsId: 'aws-jenkins-creds']]) {
                    sh '''
                        TASK_DEF_ARN=$(aws ecs describe-services \
                            --cluster my-ecs-cluster \
                            --services backend-service \
                            --query "services[0].taskDefinition" \
                            --output text)

                        NEW_TASK_DEF_JSON=$(aws ecs describe-task-definition \
                            --task-definition $TASK_DEF_ARN \
                            --query 'taskDefinition | {family:family, containerDefinitions:containerDefinitions}' \
                            --output json | \
                            jq --arg IMAGE "$ECR_IMAGE" '.containerDefinitions[0].image=$IMAGE')

                        NEW_TASK_DEF_ARN=$(aws ecs register-task-definition \
                            --cli-input-json "$NEW_TASK_DEF_JSON" \
                            --query "taskDefinition.taskDefinitionArn" \
                            --output text)

                        aws ecs update-service \
                            --cluster my-ecs-cluster \
                            --service backend-service \
                            --task-definition $NEW_TASK_DEF_ARN \
                            --force-new-deployment
                    '''
                }
            }
        }

    post {
        success {
            echo "Deployment successful! Image: ${ECR_IMAGE}"
        }
        failure {
            echo "Deployment failed!"
        }
    }
}
