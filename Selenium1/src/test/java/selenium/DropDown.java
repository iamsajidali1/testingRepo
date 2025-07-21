package selenium;

import io.github.bonigarcia.wdm.WebDriverManager;
import org.openqa.selenium.By;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.chrome.ChromeDriver;

public class DropDown {
    public static void main(String[] args) {
        WebDriverManager.chromedriver().setup();
        ChromeDriver driver= new ChromeDriver();
        driver.get("https://www.facebook.com/");
        
        JavascriptExecutor js = (JavascriptExecutor) driver;
        js.executeScript("document.getElementById('email').value='myemail@gmail.com';");
//        driver.findElement(By.xpath("//input[@id='email']")).click();

    }

}
