package selenium;

import io.github.bonigarcia.wdm.WebDriverManager;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;

import java.io.File;

public class HtmlFile {
    public static void main(String[] args) throws Exception{
        System.setProperty("webdriver.chrome.driver","C:\\Users\\Pc\\Desktop\\Train-testing\\chromedriver.exe");
//        WebDriverManager.chromedriver().setup();
        WebDriver dr = new ChromeDriver();
        dr.manage().window().maximize();
//        dr.get("https://www.wikipedia.org/");

//        Thread.sleep(2000);

//        System.out.println(System.getProperty("user.dir"));    // this gives the path of current project
        String filepath = "C:\\Users\\Pc\\Desktop\\Development\\FE\\htmlTraining\\index.html";
        String finalPath = "file:///"+filepath.replace("\\","/");


        dr.get(finalPath);
        Thread.sleep(2000);
        dr.findElement(By.xpath("//button[text()='Alert!!']")).click();
        Thread.sleep(2000);
        dr.switchTo().alert().accept();
        Thread.sleep(1000);
        dr.findElement(By.xpath("//button[text()='Prompt']")).click();
        Thread.sleep(3000);
//        dr.switchTo().alert().dismiss();

        dr.switchTo().alert().sendKeys("Hello");
        System.out.println("Prompt text: " + dr.switchTo().alert().getText());
        Thread.sleep(1000);
        dr.switchTo().alert().accept();
        Thread.sleep(1000);
        System.out.println(dr.switchTo().alert().getText());




        dr.quit();
    }
}
