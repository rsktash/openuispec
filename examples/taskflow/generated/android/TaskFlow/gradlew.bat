@ECHO OFF
SET DIRNAME=%~dp0
SET APP_HOME=%DIRNAME%
SET CLASSPATH=%APP_HOME%\gradle\wrapper\gradle-wrapper.jar

IF DEFINED JAVA_HOME (
  SET JAVA_EXE=%JAVA_HOME%\bin\java.exe
) ELSE (
  SET JAVA_EXE=java.exe
)

"%JAVA_EXE%" -Dorg.gradle.appname=gradlew -classpath "%CLASSPATH%" org.gradle.wrapper.GradleWrapperMain %*
