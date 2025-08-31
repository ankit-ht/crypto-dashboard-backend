pipeline {
    agent any

    environment {
        AWS_REGION = 'us-east-1' // your AWS region
        ECR_REPO = '016311861830.dkr.ecr.us-east-1.amazonaws.com/dev/crypto-backend' // your ECR repo name
        ECS_CLUSTER = 'my-ecs-cluster'
        ECS_SERVICE = 'backend-service'
        AWS_ACCOUNT_ID = '016311861830' // your AWS account ID
        IMAGE_TAG = "${env.BUILD_NUMBER}"
        IMAGE_URI = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}:${IMAGE_TAG}"
        GIT_REPO = 'https://github.com/ankit-ht/crypto-dashboard-backend.git' // your public GitHub repo URL
        GIT_BRANCH = 'main' // branch to checkout
    }

    stages {
        stage('Checkout') {
            steps {
                git branch: "${GIT_BRANCH}", url: "${GIT_REPO}"
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    dockerImage = docker.build("${ECR_REPO}:${IMAGE_TAG}", "server/")
                }
            }
        }

        stage('Login to ECR and Push Image') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'aws-jenkins-creds', usernameVariable: 'AWS_ACCESS_KEY_ID', passwordVariable: 'AWS_SECRET_ACCESS_KEY')]) {
                    sh '''
                    export AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
                    export AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
                    export AWS_DEFAULT_REGION=${AWS_REGION}

                    aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

                    docker tag ${ECR_REPO}:${IMAGE_TAG} ${IMAGE_URI}
                    docker push ${IMAGE_URI}
                    '''
                }
            }
        }

        stage('Update ECS Task Definition and Deploy') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'aws-jenkins-creds', usernameVariable: 'AWS_ACCESS_KEY_ID', passwordVariable: 'AWS_SECRET_ACCESS_KEY')]) {
                    script {
                        sh '''
                        export AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
                        export AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
                        export AWS_DEFAULT_REGION=${AWS_REGION}
                        '''

                        def taskDefJson = sh (
                            script: "aws ecs describe-task-definition --task-definition ${ECS_SERVICE} --region ${AWS_REGION}",
                            returnStdout: true
                        ).trim()

                        def taskDef = readJSON text: taskDefJson
                        def containerDefs = taskDef.taskDefinition.containerDefinitions

                        containerDefs.each { containerDef ->
                            containerDef.image = IMAGE_URI
                        }

                        def newTaskDef = [
                            family: taskDef.taskDefinition.family,
                            taskRoleArn: taskDef.taskDefinition.taskRoleArn,
                            executionRoleArn: taskDef.taskDefinition.executionRoleArn,
                            networkMode: taskDef.taskDefinition.networkMode,
                            containerDefinitions: containerDefs,
                            volumes: taskDef.taskDefinition.volumes,
                            placementConstraints: taskDef.taskDefinition.placementConstraints,
                            requiresCompatibilities: taskDef.taskDefinition.requiresCompatibilities,
                            cpu: taskDef.taskDefinition.cpu,
                            memory: taskDef.taskDefinition.memory
                        ]

                        writeJSON file: 'new-task-def.json', json: newTaskDef, pretty: 4

                        def registerOutput = sh (
                            script: "aws ecs register-task-definition --cli-input-json file://new-task-def.json --region ${AWS_REGION}",
                            returnStdout: true
                        ).trim()

                        def registerJson = readJSON text: registerOutput
                        def newRevision = registerJson.taskDefinition.revision

                        echo "Registered new task definition revision: ${newRevision}"

                        sh """
                        aws ecs update-service --cluster ${ECS_CLUSTER} --service ${ECS_SERVICE} --task-definition ${ECS_SERVICE}:${newRevision} --region ${AWS_REGION}
                        """
                    }
                }
            }
        }
    }
}
